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

import { CaseService } from '../../services';
import { createCaseError } from '../../common/error';
import { constructQueryOptions, getAuthorizationFilter } from '../utils';
import { Authorization } from '../../authorization/authorization';
import { includeFieldsRequiredForAuthentication } from '../../authorization/utils';
import { Operations } from '../../authorization';
import { AuditLogger } from '../../../../security/server';
import { transformCases } from '../../common';

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
  options,
  auditLogger,
}: FindParams): Promise<CasesFindResponse> => {
  try {
    const queryParams = pipe(
      excess(CasesFindRequestRt).decode(options),
      fold(throwErrors(Boom.badRequest), identity)
    );

    const {
      filter: authorizationFilter,
      ensureSavedObjectsAreAuthorized,
      logSuccessfulAuthorization,
    } = await getAuthorizationFilter({
      authorization: auth,
      operation: Operations.findCases,
      auditLogger,
    });

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
        fields: includeFieldsRequiredForAuthentication(queryParams.fields),
      },
      subCaseOptions: caseQueries.subCase,
    });

    ensureSavedObjectsAreAuthorized([...cases.casesMap.values()]);

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
