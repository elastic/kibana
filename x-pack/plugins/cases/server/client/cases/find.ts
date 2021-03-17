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
} from '../../../common';
import { CaseServiceSetup } from '../../services';
import { createCaseError } from '../../common/error';
import { constructQueryOptions } from '../../routes/api/cases/helpers';
import { transformCases } from '../../routes/api/utils';

interface FindParams {
  savedObjectsClient: SavedObjectsClientContract;
  caseService: CaseServiceSetup;
  logger: Logger;
  options: CasesFindRequest;
}

/**
 * Retrieves a case and optionally its comments and sub case comments.
 */
export const find = async ({
  savedObjectsClient,
  caseService,
  logger,
  options,
}: FindParams): Promise<CasesFindResponse> => {
  try {
    const queryParams = pipe(
      CasesFindRequestRt.decode(options),
      fold(throwErrors(Boom.badRequest), identity)
    );

    const queryArgs = {
      tags: queryParams.tags,
      reporters: queryParams.reporters,
      sortByField: queryParams.sortField,
      status: queryParams.status,
      caseType: queryParams.type,
    };

    const caseQueries = constructQueryOptions(queryArgs);
    const cases = await caseService.findCasesGroupedByID({
      client: savedObjectsClient,
      caseOptions: { ...queryParams, ...caseQueries.case },
      subCaseOptions: caseQueries.subCase,
    });

    const [openCases, inProgressCases, closedCases] = await Promise.all([
      ...caseStatuses.map((status) => {
        const statusQuery = constructQueryOptions({ ...queryArgs, status });
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
