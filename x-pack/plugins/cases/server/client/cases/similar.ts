/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression, nodeBuilder } from '@kbn/es-query';
import type { SimilarCasesSearchRequest } from '../../../common/types/api';
import {
  type CasesFindResponse,
  CasesFindResponseRt,
  SimilarCasesSearchRequestRt,
} from '../../../common/types/api';
import { decodeWithExcessOrThrow, decodeOrThrow } from '../../common/runtime_types';

import { createCaseError } from '../../common/error';
import type { CasesClientArgs } from '..';
import { flattenCaseSavedObject } from '../../common/utils';

/**
 * Retrieves cases similar to a given Case
 *
 * @ignore
 */
export const similar = async (
  params: SimilarCasesSearchRequest,
  clientArgs: CasesClientArgs
): Promise<CasesFindResponse> => {
  const {
    services: { caseService },
    logger,
  } = clientArgs;

  try {
    const paramArgs = decodeWithExcessOrThrow(SimilarCasesSearchRequestRt)(params);

    const filterExpressions = Object.keys(paramArgs.observables).flatMap((typeKey) => {
      return Object.values(paramArgs.observables[typeKey]).map((observableValue) => {
        return fromKueryExpression(
          `cases.attributes.observables:{value: "${observableValue}" AND typeKey: "${typeKey}"}`
        );
      });
    });

    const cases = await caseService.findSimilarCases({
      search: `-"cases:${params.case_id}"`,
      rootSearchFields: ['_id'],
      filter: nodeBuilder.or(filterExpressions),
      page: params.pageIndex + 1,
      perPage: params.pageSize,
    });

    const res = {
      cases: cases.saved_objects.map((so) => flattenCaseSavedObject({ savedObject: so })),
      page: cases.page,
      per_page: cases.per_page,
      total: cases.total,
      count_open_cases: 0,
      count_in_progress_cases: 0,
      count_closed_cases: 0,
    };

    return decodeOrThrow(CasesFindResponseRt)(res);
  } catch (error) {
    throw createCaseError({
      message: `Failed to find cases: ${JSON.stringify(params)}: ${error}`,
      error,
      logger,
    });
  }
};
