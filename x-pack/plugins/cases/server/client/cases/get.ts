/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import { SavedObject, SavedObjectsResolveResponse } from 'kibana/server';
import {
  CaseResponseRt,
  CaseResponse,
  CaseResolveResponseRt,
  CaseResolveResponse,
  User,
  AllTagsFindRequest,
  AllTagsFindRequestRt,
  excess,
  throwErrors,
  AllReportersFindRequestRt,
  AllReportersFindRequest,
  CasesByAlertIDRequest,
  CasesByAlertIDRequestRt,
  CasesByAlertId,
  CasesByAlertIdRt,
  CaseAttributes,
} from '../../../common/api';
import { ENABLE_CASE_CONNECTOR } from '../../../common/constants';
import { createCaseError } from '../../common/error';
import { countAlertsForID, flattenCaseSavedObject } from '../../common/utils';
import { CasesClientArgs } from '..';
import { Operations } from '../../authorization';
import { combineAuthorizedAndOwnerFilter } from '../utils';
import { CasesService } from '../../services';

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
): Promise<CasesByAlertId> => {
  const { unsecuredSavedObjectsClient, caseService, logger, authorization } = clientArgs;

  try {
    const queryParams = pipe(
      excess(CasesByAlertIDRequestRt).decode(options),
      fold(throwErrors(Boom.badRequest), identity)
    );

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
      unsecuredSavedObjectsClient,
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

    const casesInfo = await caseService.getCases({
      unsecuredSavedObjectsClient,
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

    return CasesByAlertIdRt.encode(
      validCasesInfo.map((caseInfo) => ({
        id: caseInfo.id,
        title: caseInfo.attributes.title,
      }))
    );
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
  /**
   * Whether to include the attachments for all children of a case in the response
   */
  includeSubCaseComments?: boolean;
}

/**
 * Retrieves a case and optionally its comments and sub case comments.
 *
 * @ignore
 */
export const get = async (
  { id, includeComments, includeSubCaseComments }: GetParams,
  clientArgs: CasesClientArgs
): Promise<CaseResponse> => {
  const { unsecuredSavedObjectsClient, caseService, logger, authorization } = clientArgs;

  try {
    if (!ENABLE_CASE_CONNECTOR && includeSubCaseComments) {
      throw Boom.badRequest(
        'The `includeSubCaseComments` is not supported when the case connector feature is disabled'
      );
    }

    let theCase: SavedObject<CaseAttributes>;
    let subCaseIds: string[] = [];
    if (ENABLE_CASE_CONNECTOR) {
      const [caseInfo, subCasesForCaseId] = await Promise.all([
        caseService.getCase({
          unsecuredSavedObjectsClient,
          id,
        }),
        caseService.findSubCasesByCaseId({
          unsecuredSavedObjectsClient,
          ids: [id],
        }),
      ]);

      theCase = caseInfo;
      subCaseIds = subCasesForCaseId.saved_objects.map((so) => so.id);
    } else {
      theCase = await caseService.getCase({
        unsecuredSavedObjectsClient,
        id,
      });
    }

    await authorization.ensureAuthorized({
      operation: Operations.getCase,
      entities: [{ owner: theCase.attributes.owner, id: theCase.id }],
    });

    if (!includeComments) {
      return CaseResponseRt.encode(
        flattenCaseSavedObject({
          savedObject: theCase,
          subCaseIds,
        })
      );
    }

    const theComments = await caseService.getAllCaseComments({
      unsecuredSavedObjectsClient,
      id,
      options: {
        sortField: 'created_at',
        sortOrder: 'asc',
      },
      includeSubCaseComments: ENABLE_CASE_CONNECTOR && includeSubCaseComments,
    });

    return CaseResponseRt.encode(
      flattenCaseSavedObject({
        savedObject: theCase,
        comments: theComments.saved_objects,
        subCaseIds,
        totalComment: theComments.total,
        totalAlerts: countAlertsForID({ comments: theComments, id }),
      })
    );
  } catch (error) {
    throw createCaseError({ message: `Failed to get case id: ${id}: ${error}`, error, logger });
  }
};

/**
 * Retrieves a case resolving its ID and optionally loading its comments and sub case comments.
 *
 * @experimental
 */
export const resolve = async (
  { id, includeComments, includeSubCaseComments }: GetParams,
  clientArgs: CasesClientArgs
): Promise<CaseResolveResponse> => {
  const { unsecuredSavedObjectsClient, caseService, logger, authorization } = clientArgs;

  try {
    if (!ENABLE_CASE_CONNECTOR && includeSubCaseComments) {
      throw Boom.badRequest(
        'The `includeSubCaseComments` is not supported when the case connector feature is disabled'
      );
    }

    const {
      saved_object: resolvedSavedObject,
      ...resolveData
    }: SavedObjectsResolveResponse<CaseAttributes> = await caseService.getResolveCase({
      unsecuredSavedObjectsClient,
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

    let subCaseIds: string[] = [];
    if (ENABLE_CASE_CONNECTOR) {
      const subCasesForCaseId = await caseService.findSubCasesByCaseId({
        unsecuredSavedObjectsClient,
        ids: [resolvedSavedObject.id],
      });
      subCaseIds = subCasesForCaseId.saved_objects.map((so) => so.id);
    }

    if (!includeComments) {
      return CaseResolveResponseRt.encode({
        ...resolveData,
        case: flattenCaseSavedObject({
          savedObject: resolvedSavedObject,
          subCaseIds,
        }),
      });
    }

    const theComments = await caseService.getAllCaseComments({
      unsecuredSavedObjectsClient,
      id: resolvedSavedObject.id,
      options: {
        sortField: 'created_at',
        sortOrder: 'asc',
      },
      includeSubCaseComments: ENABLE_CASE_CONNECTOR && includeSubCaseComments,
    });

    return CaseResolveResponseRt.encode({
      ...resolveData,
      case: flattenCaseSavedObject({
        savedObject: resolvedSavedObject,
        subCaseIds,
        comments: theComments.saved_objects,
        totalComment: theComments.total,
        totalAlerts: countAlertsForID({ comments: theComments, id: resolvedSavedObject.id }),
      }),
    });
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
  const { unsecuredSavedObjectsClient, caseService, logger, authorization } = clientArgs;

  try {
    const queryParams = pipe(
      excess(AllTagsFindRequestRt).decode(params),
      fold(throwErrors(Boom.badRequest), identity)
    );

    const { filter: authorizationFilter } = await authorization.getAuthorizationFilter(
      Operations.findCases
    );

    const filter = combineAuthorizedAndOwnerFilter(queryParams.owner, authorizationFilter);

    const tags = await caseService.getTags({
      unsecuredSavedObjectsClient,
      filter,
    });

    return tags;
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
  const { unsecuredSavedObjectsClient, caseService, logger, authorization } = clientArgs;

  try {
    const queryParams = pipe(
      excess(AllReportersFindRequestRt).decode(params),
      fold(throwErrors(Boom.badRequest), identity)
    );

    const { filter: authorizationFilter } = await authorization.getAuthorizationFilter(
      Operations.getReporters
    );

    const filter = combineAuthorizedAndOwnerFilter(queryParams.owner, authorizationFilter);

    const reporters = await caseService.getReporters({
      unsecuredSavedObjectsClient,
      filter,
    });

    return reporters;
  } catch (error) {
    throw createCaseError({ message: `Failed to get reporters: ${error}`, error, logger });
  }
}
