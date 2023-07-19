/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsResolveResponse } from '@kbn/core/server';
import type { AttachmentTotals, Case, CaseAttributes, User } from '../../../common/types/domain';
import type {
  AllCategoriesFindRequest,
  AllReportersFindRequest,
  AllTagsFindRequest,
  CaseResolveResponse,
  CasesByAlertIDRequest,
  GetRelatedCasesByAlertResponse,
} from '../../../common/types/api';
import {
  AllCategoriesFindRequestRt,
  AllReportersFindRequestRt,
  AllTagsFindRequestRt,
  CaseResolveResponseRt,
  CasesByAlertIDRequestRt,
  GetCategoriesResponseRt,
  GetRelatedCasesByAlertResponseRt,
  GetReportersResponseRt,
  GetTagsResponseRt,
} from '../../../common/types/api';
import { decodeWithExcessOrThrow } from '../../../common/api';
import { createCaseError } from '../../common/error';
import { countAlertsForID, flattenCaseSavedObject, countUserAttachments } from '../../common/utils';
import type { CasesClientArgs } from '..';
import { Operations } from '../../authorization';
import { combineAuthorizedAndOwnerFilter } from '../utils';
import { CasesService } from '../../services';
import type { CaseSavedObjectTransformed } from '../../common/types/case';
import { decodeOrThrow } from '../../../common/api/runtime_types';
import { CaseRt } from '../../../common/types/domain';

/**
 * Parameters for finding cases IDs using an alert ID
 */
export interface CasesByAlertIDParams {
  /**
   * The alert ID to search for
   */
  alertID: string;
  /**
   * The filtering options when searching for associated cases.
   */
  options: CasesByAlertIDRequest;
}

/**
 * Case Client wrapper function for retrieving the case IDs and titles that have a particular alert ID
 * attached to them. This handles RBAC before calling the saved object API.
 *
 * @ignore
 */
export const getCasesByAlertID = async (
  { alertID, options }: CasesByAlertIDParams,
  clientArgs: CasesClientArgs
): Promise<GetRelatedCasesByAlertResponse> => {
  const {
    services: { caseService, attachmentService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const queryParams = decodeWithExcessOrThrow(CasesByAlertIDRequestRt)(options);

    const { filter: authorizationFilter, ensureSavedObjectsAreAuthorized } =
      await authorization.getAuthorizationFilter(Operations.getCaseIDsByAlertID);

    const filter = combineAuthorizedAndOwnerFilter(
      queryParams.owner,
      authorizationFilter,
      Operations.getCaseIDsByAlertID.savedObjectType
    );

    // This will likely only return one comment saved object, the response aggregation will contain
    // the keys we need to retrieve the cases
    const commentsWithAlert = await caseService.getCaseIdsByAlertId({
      alertId: alertID,
      filter,
    });

    // make sure the comments returned have the right owner
    ensureSavedObjectsAreAuthorized(
      commentsWithAlert.saved_objects.map((comment) => ({
        owner: comment.attributes.owner,
        id: comment.id,
      }))
    );

    const caseIds = CasesService.getCaseIDsFromAlertAggs(commentsWithAlert);

    // if we didn't find any case IDs then let's return early because there's nothing to request
    if (caseIds.length <= 0) {
      return [];
    }

    const commentStats = await attachmentService.getter.getCaseCommentStats({
      caseIds,
    });

    const casesInfo = await caseService.getCases({
      caseIds,
    });

    // if there was an error retrieving one of the cases (maybe it was deleted, but the alert comment still existed)
    // just ignore it
    const validCasesInfo = casesInfo.saved_objects.filter(
      (caseInfo) => caseInfo.error === undefined
    );

    ensureSavedObjectsAreAuthorized(
      validCasesInfo.map((caseInfo) => ({
        owner: caseInfo.attributes.owner,
        id: caseInfo.id,
      }))
    );

    const res = validCasesInfo.map((caseInfo) => ({
      id: caseInfo.id,
      title: caseInfo.attributes.title,
      description: caseInfo.attributes.description,
      status: caseInfo.attributes.status,
      createdAt: caseInfo.attributes.created_at,
      totals: getAttachmentTotalsForCaseId(caseInfo.id, commentStats),
    }));

    return decodeOrThrow(GetRelatedCasesByAlertResponseRt)(res);
  } catch (error) {
    throw createCaseError({
      message: `Failed to get case IDs using alert ID: ${alertID} options: ${JSON.stringify(
        options
      )}: ${error}`,
      error,
      logger,
    });
  }
};

const getAttachmentTotalsForCaseId = (id: string, stats: Map<string, AttachmentTotals>) =>
  stats.get(id) ?? { alerts: 0, userComments: 0 };

/**
 * The parameters for retrieving a case
 */
export interface GetParams {
  /**
   * Case ID
   */
  id: string;
  /**
   * Whether to include the attachments for a case in the response
   */
  includeComments?: boolean;
}

/**
 * Retrieves a case and optionally its comments.
 *
 * @ignore
 */
export const get = async (
  { id, includeComments }: GetParams,
  clientArgs: CasesClientArgs
): Promise<Case> => {
  const {
    services: { caseService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const theCase: CaseSavedObjectTransformed = await caseService.getCase({
      id,
    });

    await authorization.ensureAuthorized({
      operation: Operations.getCase,
      entities: [{ owner: theCase.attributes.owner, id: theCase.id }],
    });

    if (!includeComments) {
      return decodeOrThrow(CaseRt)(
        flattenCaseSavedObject({
          savedObject: theCase,
        })
      );
    }

    const theComments = await caseService.getAllCaseComments({
      id,
      options: {
        sortField: 'created_at',
        sortOrder: 'asc',
      },
    });

    const res = flattenCaseSavedObject({
      savedObject: theCase,
      comments: theComments.saved_objects,
      totalComment: countUserAttachments(theComments.saved_objects),
      totalAlerts: countAlertsForID({ comments: theComments, id }),
    });

    return decodeOrThrow(CaseRt)(res);
  } catch (error) {
    throw createCaseError({ message: `Failed to get case id: ${id}: ${error}`, error, logger });
  }
};

/**
 * Retrieves a case resolving its ID and optionally loading its comments.
 *
 * @experimental
 */
export const resolve = async (
  { id, includeComments }: GetParams,
  clientArgs: CasesClientArgs
): Promise<CaseResolveResponse> => {
  const {
    services: { caseService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const {
      saved_object: resolvedSavedObject,
      ...resolveData
    }: SavedObjectsResolveResponse<CaseAttributes> = await caseService.getResolveCase({
      id,
    });

    await authorization.ensureAuthorized({
      operation: Operations.resolveCase,
      entities: [
        {
          id: resolvedSavedObject.id,
          owner: resolvedSavedObject.attributes.owner,
        },
      ],
    });

    if (!includeComments) {
      return decodeOrThrow(CaseResolveResponseRt)({
        ...resolveData,
        case: flattenCaseSavedObject({
          savedObject: resolvedSavedObject,
        }),
      });
    }

    const theComments = await caseService.getAllCaseComments({
      id: resolvedSavedObject.id,
      options: {
        sortField: 'created_at',
        sortOrder: 'asc',
      },
    });

    const res = {
      ...resolveData,
      case: flattenCaseSavedObject({
        savedObject: resolvedSavedObject,
        comments: theComments.saved_objects,
        totalComment: theComments.total,
        totalAlerts: countAlertsForID({ comments: theComments, id: resolvedSavedObject.id }),
      }),
    };

    return decodeOrThrow(CaseResolveResponseRt)(res);
  } catch (error) {
    throw createCaseError({ message: `Failed to resolve case id: ${id}: ${error}`, error, logger });
  }
};

/**
 * Retrieves the tags from all the cases.
 */

export async function getTags(
  params: AllTagsFindRequest,
  clientArgs: CasesClientArgs
): Promise<string[]> {
  const {
    unsecuredSavedObjectsClient,
    services: { caseService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const queryParams = decodeWithExcessOrThrow(AllTagsFindRequestRt)(params);

    const { filter: authorizationFilter } = await authorization.getAuthorizationFilter(
      Operations.getTags
    );

    const filter = combineAuthorizedAndOwnerFilter(queryParams.owner, authorizationFilter);

    const tags = await caseService.getTags({
      unsecuredSavedObjectsClient,
      filter,
    });

    return decodeOrThrow(GetTagsResponseRt)(tags);
  } catch (error) {
    throw createCaseError({ message: `Failed to get tags: ${error}`, error, logger });
  }
}

/**
 * Retrieves the reporters from all the cases.
 */
export async function getReporters(
  params: AllReportersFindRequest,
  clientArgs: CasesClientArgs
): Promise<User[]> {
  const {
    unsecuredSavedObjectsClient,
    services: { caseService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const queryParams = decodeWithExcessOrThrow(AllReportersFindRequestRt)(params);

    const { filter: authorizationFilter } = await authorization.getAuthorizationFilter(
      Operations.getReporters
    );

    const filter = combineAuthorizedAndOwnerFilter(queryParams.owner, authorizationFilter);

    const reporters = await caseService.getReporters({
      unsecuredSavedObjectsClient,
      filter,
    });

    return decodeOrThrow(GetReportersResponseRt)(reporters);
  } catch (error) {
    throw createCaseError({ message: `Failed to get reporters: ${error}`, error, logger });
  }
}

/**
 * Retrieves the categories from all the cases.
 */
export async function getCategories(
  params: AllCategoriesFindRequest,
  clientArgs: CasesClientArgs
): Promise<string[]> {
  const {
    unsecuredSavedObjectsClient,
    services: { caseService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const queryParams = decodeWithExcessOrThrow(AllCategoriesFindRequestRt)(params);

    const { filter: authorizationFilter } = await authorization.getAuthorizationFilter(
      Operations.getCategories
    );

    const filter = combineAuthorizedAndOwnerFilter(queryParams.owner, authorizationFilter);

    const categories = await caseService.getCategories({
      unsecuredSavedObjectsClient,
      filter,
    });

    return decodeOrThrow(GetCategoriesResponseRt)(categories);
  } catch (error) {
    throw createCaseError({ message: `Failed to get categories: ${error}`, error, logger });
  }
}
