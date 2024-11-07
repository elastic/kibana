/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesSimilarResponse, SimilarCasesSearchRequest } from '../../../common/types/api';
import { SimilarCasesSearchRequestRt, CasesSimilarResponseRt } from '../../../common/types/api';
import { decodeWithExcessOrThrow, decodeOrThrow } from '../../common/runtime_types';

import { createCaseError } from '../../common/error';
import type { CasesClientArgs } from '..';
import { defaultSortField, flattenCaseSavedObject } from '../../common/utils';
import { Operations } from '../../authorization';
import { buildObservablesFieldsFilter } from '../utils';
import { combineFilterWithAuthorizationFilter } from '../../authorization/utils';

/**
 * Retrieves cases similar to a given Case
 *
 * @ignore
 */
export const similar = async (
  params: SimilarCasesSearchRequest,
  clientArgs: CasesClientArgs
): Promise<CasesSimilarResponse> => {
  const {
    services: { caseService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const paramArgs = decodeWithExcessOrThrow(SimilarCasesSearchRequestRt)(params);
    const retrievedCase = await caseService.getCase({ id: paramArgs.case_id });

    if (!retrievedCase.attributes.observables.length) {
      return {
        cases: [],
        page: 1,
        per_page: params.pageSize,
        total: 0,
      };
    }

    const { filter: authorizationFilter, ensureSavedObjectsAreAuthorized } =
      await authorization.getAuthorizationFilter(Operations.findCases);

    const similarCasesFilter = buildObservablesFieldsFilter(
      retrievedCase.attributes.observables.reduce((observableMap, observable) => {
        if (!observableMap[observable.typeKey]) {
          observableMap[observable.typeKey] = [];
        }

        observableMap[observable.typeKey].push(observable.value);

        return observableMap;
      }, {} as Record<string, string[]>)
    );

    const finalCasesFilter = combineFilterWithAuthorizationFilter(
      similarCasesFilter,
      authorizationFilter
    );

    const cases = await caseService.findCases({
      filter: finalCasesFilter,
      sortField: defaultSortField,
      search: `-"cases:${paramArgs.case_id}"`,
      rootSearchFields: ['_id'],
      page: params.pageIndex + 1,
      perPage: params.pageSize,
    });

    ensureSavedObjectsAreAuthorized(
      cases.saved_objects.map((caseSavedObject) => ({
        id: caseSavedObject.id,
        owner: caseSavedObject.attributes.owner,
      }))
    );

    const res = {
      cases: cases.saved_objects.map((so) => flattenCaseSavedObject({ savedObject: so })),
      page: cases.page,
      per_page: cases.per_page,
      total: cases.total,
    };

    return decodeOrThrow(CasesSimilarResponseRt)(res);
  } catch (error) {
    throw createCaseError({
      message: `Failed to find cases: ${JSON.stringify(params)}: ${error}`,
      error,
      logger,
    });
  }
};
