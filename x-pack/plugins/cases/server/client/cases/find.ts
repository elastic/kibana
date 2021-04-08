/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { SavedObjectsClientContract, Logger } from 'kibana/server';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import type { PublicMethodsOf } from '@kbn/utility-types';
import {
  CasesFindResponse,
  CasesFindRequest,
  CasesFindRequestRt,
  throwErrors,
  caseStatuses,
  CasesFindResponseRt,
  excess,
} from '../../../common/api';

import { CASE_SAVED_OBJECT } from '../../../common/constants';
import { CaseService } from '../../services';
import { createCaseError } from '../../common/error';
import { constructQueryOptions } from '../utils';
import { transformCases } from '../../routes/api/utils';
import { Authorization } from '../../authorization/authorization';
import { includeFieldsRequiredForAuthentication } from '../../authorization/utils';
import { AuthorizationFilter, Operations } from '../../authorization';
import { AuditLogger } from '../../../../security/server';
import { createAuditMsg } from '../../common';

interface FindParams {
  savedObjectsClient: SavedObjectsClientContract;
  caseService: CaseService;
  logger: Logger;
  auth: PublicMethodsOf<Authorization>;
  options: CasesFindRequest;
  auditLogger?: AuditLogger;
}

/**
 * Retrieves a case and optionally its comments and sub case comments.
 */
export const find = async ({
  savedObjectsClient,
  caseService,
  logger,
  auth,
  auditLogger,
  options,
}: FindParams): Promise<CasesFindResponse> => {
  try {
    const queryParams = pipe(
      excess(CasesFindRequestRt).decode(options),
      fold(throwErrors(Boom.badRequest), identity)
    );

    let authFindHelpers: AuthorizationFilter;
    try {
      authFindHelpers = await auth.getFindAuthorizationFilter(CASE_SAVED_OBJECT);
    } catch (error) {
      auditLogger?.log(createAuditMsg({ operation: Operations.findCases, error }));
      throw error;
    }

    const {
      filter: authorizationFilter,
      ensureSavedObjectIsAuthorized,
      logSuccessfulAuthorization,
    } = authFindHelpers;

    const queryArgs = {
      tags: queryParams.tags,
      reporters: queryParams.reporters,
      sortByField: queryParams.sortField,
      status: queryParams.status,
      caseType: queryParams.type,
      owner: queryParams.owner,
    };

    const caseQueries = constructQueryOptions({ ...queryArgs, authorizationFilter });
    const cases = await caseService.findCasesGroupedByID({
      soClient: savedObjectsClient,
      caseOptions: {
        ...queryParams,
        ...caseQueries.case,
        searchFields:
          queryParams.searchFields != null
            ? Array.isArray(queryParams.searchFields)
              ? queryParams.searchFields
              : [queryParams.searchFields]
            : queryParams.searchFields,
        fields: queryParams.fields
          ? includeFieldsRequiredForAuthentication(queryParams.fields)
          : queryParams.fields,
      },
      subCaseOptions: caseQueries.subCase,
    });

    for (const theCase of cases.casesMap.values()) {
      try {
        ensureSavedObjectIsAuthorized(theCase.owner);
        // log each of the found cases
        auditLogger?.log(
          createAuditMsg({ operation: Operations.findCases, savedObjectID: theCase.id })
        );
      } catch (error) {
        auditLogger?.log(
          createAuditMsg({ operation: Operations.findCases, error, savedObjectID: theCase.id })
        );
        throw error;
      }
    }

    // TODO: Make sure we do not leak information when authorization is on
    const [openCases, inProgressCases, closedCases] = await Promise.all([
      ...caseStatuses.map((status) => {
        const statusQuery = constructQueryOptions({ ...queryArgs, status, authorizationFilter });
        return caseService.findCaseStatusStats({
          soClient: savedObjectsClient,
          caseOptions: statusQuery.case,
          subCaseOptions: statusQuery.subCase,
        });
      }),
    ]);

    logSuccessfulAuthorization();

    return CasesFindResponseRt.encode(
      transformCases({
        casesMap: cases.casesMap,
        page: cases.page,
        perPage: cases.perPage,
        total: cases.total,
        countOpenCases: openCases,
        countInProgressCases: inProgressCases,
        countClosedCases: closedCases,
      })
    );
  } catch (error) {
    throw createCaseError({
      message: `Failed to find cases: ${JSON.stringify(options)}: ${error}`,
      error,
      logger,
    });
  }
};
