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

import { SavedObject } from 'kibana/server';
import {
  CaseResponseRt,
  CaseResponse,
  ESCaseAttributes,
  User,
  UsersRt,
  AllTagsFindRequest,
  AllTagsFindRequestRt,
  excess,
  throwErrors,
  AllReportersFindRequestRt,
  AllReportersFindRequest,
} from '../../../common/api';
import { countAlertsForID, flattenCaseSavedObject } from '../../common';
import { createCaseError } from '../../common/error';
import { ENABLE_CASE_CONNECTOR } from '../../../common/constants';
import { CasesClientArgs } from '..';
import { AuthorizationFilter, Operations } from '../../authorization';
import { constructQueryOptions, createAuditMsg } from '../utils';

interface GetParams {
  id: string;
  includeComments?: boolean;
  includeSubCaseComments?: boolean;
}

/**
 * Retrieves a case and optionally its comments and sub case comments.
 */
export const get = async (
  { id, includeComments, includeSubCaseComments }: GetParams,
  clientArgs: CasesClientArgs
): Promise<CaseResponse> => {
  const { savedObjectsClient, caseService, logger, authorization: auth, auditLogger } = clientArgs;

  try {
    if (!ENABLE_CASE_CONNECTOR && includeSubCaseComments) {
      throw Boom.badRequest(
        'The `includeSubCaseComments` is not supported when the case connector feature is disabled'
      );
    }

    let theCase: SavedObject<ESCaseAttributes>;
    let subCaseIds: string[] = [];

    if (ENABLE_CASE_CONNECTOR) {
      const [caseInfo, subCasesForCaseId] = await Promise.all([
        caseService.getCase({
          soClient: savedObjectsClient,
          id,
        }),
        caseService.findSubCasesByCaseId({ soClient: savedObjectsClient, ids: [id] }),
      ]);

      theCase = caseInfo;
      subCaseIds = subCasesForCaseId.saved_objects.map((so) => so.id);
    } else {
      theCase = await caseService.getCase({
        soClient: savedObjectsClient,
        id,
      });
    }

    try {
      await auth.ensureAuthorized([theCase.attributes.owner], Operations.getCase);
    } catch (error) {
      auditLogger?.log(
        createAuditMsg({ operation: Operations.getCase, error, savedObjectID: theCase.id })
      );
      throw error;
    }

    if (!includeComments) {
      return CaseResponseRt.encode(
        flattenCaseSavedObject({
          savedObject: theCase,
          subCaseIds,
        })
      );
    }
    const theComments = await caseService.getAllCaseComments({
      soClient: savedObjectsClient,
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
 * Retrieves the tags from all the cases.
 */

export async function getTags(
  params: AllTagsFindRequest,
  clientArgs: CasesClientArgs
): Promise<string[]> {
  const {
    savedObjectsClient: soClient,
    caseService,
    logger,
    authorization: auth,
    auditLogger,
  } = clientArgs;

  try {
    const queryParams = pipe(
      excess(AllTagsFindRequestRt).decode(params),
      fold(throwErrors(Boom.badRequest), identity)
    );

    let authFindHelpers: AuthorizationFilter;
    try {
      authFindHelpers = await auth.getFindAuthorizationFilter(Operations.getTags);
    } catch (error) {
      auditLogger?.log(createAuditMsg({ operation: Operations.getTags, error }));
      throw error;
    }

    const { filter: authorizationFilter } = authFindHelpers;
    const queryArgs = {
      owner: queryParams.owner,
    };

    const caseQueries = constructQueryOptions({ ...queryArgs, authorizationFilter });

    return await caseService.getTags({
      soClient,
      filter: caseQueries.case.filter,
    });
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
    savedObjectsClient: soClient,
    caseService,
    logger,
    authorization: auth,
    auditLogger,
  } = clientArgs;

  try {
    const queryParams = pipe(
      excess(AllReportersFindRequestRt).decode(params),
      fold(throwErrors(Boom.badRequest), identity)
    );

    let authFindHelpers: AuthorizationFilter;
    try {
      authFindHelpers = await auth.getFindAuthorizationFilter(Operations.getReporters);
    } catch (error) {
      auditLogger?.log(createAuditMsg({ operation: Operations.getTags, error }));
      throw error;
    }

    const { filter: authorizationFilter } = authFindHelpers;
    const queryArgs = {
      owner: queryParams.owner,
    };

    const caseQueries = constructQueryOptions({ ...queryArgs, authorizationFilter });
    const reporters = await caseService.getReporters({
      soClient,
      filter: caseQueries.case.filter,
    });

    return UsersRt.encode(reporters);
  } catch (error) {
    throw createCaseError({ message: `Failed to get reporters: ${error}`, error, logger });
  }
}
