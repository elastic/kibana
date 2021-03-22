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

import {
  CasesFindResponse,
  CasesFindRequest,
  CasesFindRequestRt,
  throwErrors,
  caseStatuses,
  CasesFindResponseRt,
} from '../../../common/api';

import { CASE_SAVED_OBJECT } from '../../../common/constants';
import { CaseServiceSetup } from '../../services';
import { createCaseError } from '../../common/error';
import { constructQueryOptions } from '../../routes/api/cases/helpers';
import { transformCases } from '../../routes/api/utils';
import { Authorization } from '../../authorization/authorization';
import { includeFieldsRequiredForAuthentication } from '../../authorization/utils';

interface FindParams {
  savedObjectsClient: SavedObjectsClientContract;
  caseService: CaseServiceSetup;
  logger: Logger;
  auth: Authorization;
  options: CasesFindRequest;
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
}: FindParams): Promise<CasesFindResponse> => {
  try {
    const queryParams = pipe(
      CasesFindRequestRt.decode(options),
      fold(throwErrors(Boom.badRequest), identity)
    );

    // TODO: Maybe surround it with try/catch
    const {
      filter: authorizationFilter,
      ensureSavedObjectIsAuthorized,
    } = await auth.getFindAuthorizationFilter(CASE_SAVED_OBJECT);

    const queryArgs = {
      tags: queryParams.tags,
      reporters: queryParams.reporters,
      sortByField: queryParams.sortField,
      status: queryParams.status,
      caseType: queryParams.type,
    };

    const caseQueries = constructQueryOptions({ ...queryArgs, authorizationFilter });
    const cases = await caseService.findCasesGroupedByID({
      client: savedObjectsClient,
      caseOptions: {
        ...queryParams,
        ...caseQueries.case,
        fields: queryParams.fields
          ? includeFieldsRequiredForAuthentication(queryParams.fields)
          : queryParams.fields,
      },
      subCaseOptions: caseQueries.subCase,
    });

    for (const theCase of cases.casesMap.values()) {
      ensureSavedObjectIsAuthorized(theCase.class);
    }

    // TODO: Make sure we do not leak information when authorization is on
    const [openCases, inProgressCases, closedCases] = await Promise.all([
      ...caseStatuses.map((status) => {
        const statusQuery = constructQueryOptions({ ...queryArgs, status, authorizationFilter });
        return caseService.findCaseStatusStats({
          client: savedObjectsClient,
          caseOptions: statusQuery.case,
          subCaseOptions: statusQuery.subCase,
        });
      }),
    ]);

    return CasesFindResponseRt.encode(
      transformCases({
        ...cases,
        countOpenCases: openCases,
        countInProgressCases: inProgressCases,
        countClosedCases: closedCases,
        total: cases.casesMap.size,
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
