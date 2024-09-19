/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import Boom from '@hapi/boom';

import { SavedObject } from 'kibana/server';
import {
  CASE_SAVED_OBJECT,
  caseStatuses,
  CommentAttributes,
  MAX_CONCURRENT_SEARCHES,
  SubCaseResponse,
  SubCaseResponseRt,
  SubCasesFindRequest,
  SubCasesFindResponse,
  SubCasesFindResponseRt,
  SubCasesPatchRequest,
} from '../../../common';
import { CasesClientArgs, CasesClientInternal } from '..';
import {
  countAlertsForID,
  createCaseError,
  flattenSubCaseSavedObject,
  transformSubCases,
} from '../../common';
import { buildCaseUserActionItem } from '../../services/user_actions/helpers';
import { constructQueryOptions } from '../utils';
import { defaultPage, defaultPerPage } from '../../routes/api';
import { update } from './update';
import { ISubCaseResponse, ISubCasesFindResponse, ISubCasesResponse } from '../typedoc_interfaces';

interface FindArgs {
  /**
   * The case ID for finding associated sub cases
   */
  caseID: string;
  /**
   * Options for filtering the returned sub cases
   */
  queryParams: SubCasesFindRequest;
}

interface GetArgs {
  /**
   * A flag to include the attachments with the results
   */
  includeComments: boolean;
  /**
   * The ID of the sub case to retrieve
   */
  id: string;
}

/**
 * The API routes for interacting with sub cases.
 *
 * @public
 */
export interface SubCasesClient {
  /**
   * Deletes the specified entities and their attachments.
   */
  delete(ids: string[]): Promise<void>;
  /**
   * Retrieves the sub cases matching the search criteria.
   */
  find(findArgs: FindArgs): Promise<ISubCasesFindResponse>;
  /**
   * Retrieves a single sub case.
   */
  get(getArgs: GetArgs): Promise<ISubCaseResponse>;
  /**
   * Updates the specified sub cases to the new values included in the request.
   */
  update(subCases: SubCasesPatchRequest): Promise<ISubCasesResponse>;
}

/**
 * Creates a client for handling the different exposed API routes for interacting with sub cases.
 *
 * @ignore
 */
export function createSubCasesClient(
  clientArgs: CasesClientArgs,
  casesClientInternal: CasesClientInternal
): SubCasesClient {
  return Object.freeze({
    delete: (ids: string[]) => deleteSubCase(ids, clientArgs),
    find: (findArgs: FindArgs) => find(findArgs, clientArgs),
    get: (getArgs: GetArgs) => get(getArgs, clientArgs),
    update: (subCases: SubCasesPatchRequest) =>
      update({ subCases, clientArgs, casesClientInternal }),
  });
}

async function deleteSubCase(ids: string[], clientArgs: CasesClientArgs): Promise<void> {
  try {
    const { unsecuredSavedObjectsClient, user, userActionService, caseService, attachmentService } =
      clientArgs;

    const [comments, subCases] = await Promise.all([
      caseService.getAllSubCaseComments({ unsecuredSavedObjectsClient, id: ids }),
      caseService.getSubCases({ unsecuredSavedObjectsClient, ids }),
    ]);

    const subCaseErrors = subCases.saved_objects.filter((subCase) => subCase.error !== undefined);

    if (subCaseErrors.length > 0) {
      throw Boom.notFound(
        `These sub cases ${subCaseErrors
          .map((c) => c.id)
          .join(', ')} do not exist. Please check you have the correct ids.`
      );
    }

    const subCaseIDToParentID = subCases.saved_objects.reduce((acc, subCase) => {
      const parentID = subCase.references.find((ref) => ref.type === CASE_SAVED_OBJECT);
      acc.set(subCase.id, parentID?.id);
      return acc;
    }, new Map<string, string | undefined>());

    const deleteCommentMapper = async (comment: SavedObject<CommentAttributes>) =>
      attachmentService.delete({ unsecuredSavedObjectsClient, attachmentId: comment.id });

    const deleteSubCasesMapper = async (id: string) =>
      caseService.deleteSubCase(unsecuredSavedObjectsClient, id);

    // Ensuring we don't too many concurrent deletions running.
    await pMap(comments.saved_objects, deleteCommentMapper, {
      concurrency: MAX_CONCURRENT_SEARCHES,
    });

    await pMap(ids, deleteSubCasesMapper, {
      concurrency: MAX_CONCURRENT_SEARCHES,
    });

    const deleteDate = new Date().toISOString();

    await userActionService.bulkCreate({
      unsecuredSavedObjectsClient,
      actions: subCases.saved_objects.map((subCase) =>
        buildCaseUserActionItem({
          action: 'delete',
          actionAt: deleteDate,
          actionBy: user,
          // if for some reason the sub case didn't have a reference to its parent, we'll still log a user action
          // but we won't have the case ID
          caseId: subCaseIDToParentID.get(subCase.id) ?? '',
          subCaseId: subCase.id,
          fields: ['sub_case', 'comment', 'status'],
          owner: subCase.attributes.owner,
        })
      ),
    });
  } catch (error) {
    throw createCaseError({
      message: `Failed to delete sub cases ids: ${JSON.stringify(ids)}: ${error}`,
      error,
      logger: clientArgs.logger,
    });
  }
}

async function find(
  { caseID, queryParams }: FindArgs,
  clientArgs: CasesClientArgs
): Promise<SubCasesFindResponse> {
  try {
    const { unsecuredSavedObjectsClient, caseService } = clientArgs;

    const ids = [caseID];
    const { subCase: subCaseQueryOptions } = constructQueryOptions({
      status: queryParams.status,
      sortByField: queryParams.sortField,
    });

    const subCases = await caseService.findSubCasesGroupByCase({
      unsecuredSavedObjectsClient,
      ids,
      options: {
        sortField: 'created_at',
        page: defaultPage,
        perPage: defaultPerPage,
        ...queryParams,
        ...subCaseQueryOptions,
      },
    });

    // casesStatuses are bounded by us. No need to limit concurrent calls.
    const [open, inProgress, closed] = await Promise.all([
      ...caseStatuses.map((status) => {
        const { subCase: statusQueryOptions } = constructQueryOptions({
          status,
          sortByField: queryParams.sortField,
        });
        return caseService.findSubCaseStatusStats({
          unsecuredSavedObjectsClient,
          options: statusQueryOptions ?? {},
          ids,
        });
      }),
    ]);

    return SubCasesFindResponseRt.encode(
      transformSubCases({
        page: subCases.page,
        perPage: subCases.perPage,
        total: subCases.total,
        subCasesMap: subCases.subCasesMap,
        open,
        inProgress,
        closed,
      })
    );
  } catch (error) {
    throw createCaseError({
      message: `Failed to find sub cases for case id: ${caseID}: ${error}`,
      error,
      logger: clientArgs.logger,
    });
  }
}

async function get(
  { includeComments, id }: GetArgs,
  clientArgs: CasesClientArgs
): Promise<SubCaseResponse> {
  try {
    const { unsecuredSavedObjectsClient, caseService } = clientArgs;

    const subCase = await caseService.getSubCase({
      unsecuredSavedObjectsClient,
      id,
    });

    if (!includeComments) {
      return SubCaseResponseRt.encode(
        flattenSubCaseSavedObject({
          savedObject: subCase,
        })
      );
    }

    const theComments = await caseService.getAllSubCaseComments({
      unsecuredSavedObjectsClient,
      id,
      options: {
        sortField: 'created_at',
        sortOrder: 'asc',
      },
    });

    return SubCaseResponseRt.encode(
      flattenSubCaseSavedObject({
        savedObject: subCase,
        comments: theComments.saved_objects,
        totalComment: theComments.total,
        totalAlerts: countAlertsForID({
          comments: theComments,
          id,
        }),
      })
    );
  } catch (error) {
    throw createCaseError({
      message: `Failed to get sub case id: ${id}: ${error}`,
      error,
      logger: clientArgs.logger,
    });
  }
}
