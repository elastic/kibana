/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { SavedObjectsClientContract } from 'kibana/server';
import {
  caseStatuses,
  SubCaseResponse,
  SubCaseResponseRt,
  SubCasesFindRequest,
  SubCasesFindResponse,
  SubCasesFindResponseRt,
  SubCasesResponse,
  User,
} from '../../../common/api';
import { CasesClientArgs } from '..';
import { flattenSubCaseSavedObject, transformSubCases } from '../../routes/api/utils';
import { countAlertsForID } from '../../common';
import { createCaseError } from '../../common/error';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import { buildCaseUserActionItem } from '../../services/user_actions/helpers';
import { constructQueryOptions } from '../../routes/api/cases/helpers';
import { defaultPage, defaultPerPage } from '../../routes/api';
import { CasesClient } from '../client';
import { update, UpdateArgs } from './update';

interface DeleteArgs {
  soClient: SavedObjectsClientContract;
  ids: string[];
  user: User;
}

interface FindArgs {
  soClient: SavedObjectsClientContract;
  caseID: string;
  queryParams: SubCasesFindRequest;
}

interface GetArgs {
  includeComments: boolean;
  id: string;
  soClient: SavedObjectsClientContract;
}

/**
 * The API routes for interacting with sub cases.
 */
export interface SubCasesClient {
  delete(deleteArgs: DeleteArgs): Promise<void>;
  find(findArgs: FindArgs): Promise<SubCasesFindResponse>;
  get(getArgs: GetArgs): Promise<SubCaseResponse>;
  update(updateArgs: UpdateArgs): Promise<SubCasesResponse>;
}

/**
 * Creates a client for handling the different exposed API routes for interacting with sub cases.
 */
export function createSubCasesClient(
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): SubCasesClient {
  return Object.freeze({
    delete: (deleteArgs: DeleteArgs) => deleteSubCase(deleteArgs, clientArgs),
    find: (findArgs: FindArgs) => find(findArgs, clientArgs),
    get: (getArgs: GetArgs) => get(getArgs, clientArgs),
    update: (updateArgs: UpdateArgs) => update(updateArgs, clientArgs, casesClient),
  });
}

async function deleteSubCase(
  { soClient, ids, user }: DeleteArgs,
  clientArgs: CasesClientArgs
): Promise<void> {
  try {
    const [comments, subCases] = await Promise.all([
      clientArgs.caseService.getAllSubCaseComments({ soClient, id: ids }),
      clientArgs.caseService.getSubCases({ soClient, ids }),
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

    await Promise.all(
      comments.saved_objects.map((comment) =>
        clientArgs.attachmentService.delete({ soClient, attachmentId: comment.id })
      )
    );

    await Promise.all(ids.map((id) => clientArgs.caseService.deleteSubCase(soClient, id)));

    const deleteDate = new Date().toISOString();

    await clientArgs.userActionService.bulkCreate({
      soClient,
      actions: ids.map((id) =>
        buildCaseUserActionItem({
          action: 'delete',
          actionAt: deleteDate,
          actionBy: user,
          // if for some reason the sub case didn't have a reference to its parent, we'll still log a user action
          // but we won't have the case ID
          caseId: subCaseIDToParentID.get(id) ?? '',
          subCaseId: id,
          fields: ['sub_case', 'comment', 'status'],
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
  { soClient, caseID, queryParams }: FindArgs,
  clientArgs: CasesClientArgs
): Promise<SubCasesFindResponse> {
  try {
    const ids = [caseID];
    const { subCase: subCaseQueryOptions } = constructQueryOptions({
      status: queryParams.status,
      sortByField: queryParams.sortField,
    });

    const subCases = await clientArgs.caseService.findSubCasesGroupByCase({
      soClient,
      ids,
      options: {
        sortField: 'created_at',
        page: defaultPage,
        perPage: defaultPerPage,
        ...queryParams,
        ...subCaseQueryOptions,
      },
    });

    const [open, inProgress, closed] = await Promise.all([
      ...caseStatuses.map((status) => {
        const { subCase: statusQueryOptions } = constructQueryOptions({
          status,
          sortByField: queryParams.sortField,
        });
        return clientArgs.caseService.findSubCaseStatusStats({
          soClient,
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
  { includeComments, id, soClient }: GetArgs,
  clientArgs: CasesClientArgs
): Promise<SubCaseResponse> {
  try {
    const subCase = await clientArgs.caseService.getSubCase({
      soClient,
      id,
    });

    if (!includeComments) {
      return SubCaseResponseRt.encode(
        flattenSubCaseSavedObject({
          savedObject: subCase,
        })
      );
    }

    const theComments = await clientArgs.caseService.getAllSubCaseComments({
      soClient,
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
