/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { intersection } from 'lodash';
import Boom from '@hapi/boom';
import { OWNER_FIELD } from '../../../common/constants';
import type { CasesSimilarResponse, SimilarCasesSearchRequest } from '../../../common/types/api';
import { SimilarCasesSearchRequestRt, CasesSimilarResponseRt } from '../../../common/types/api';
import { decodeWithExcessOrThrow, decodeOrThrow } from '../../common/runtime_types';

import { createCaseError } from '../../common/error';
import type { CasesClient, CasesClientArgs } from '..';
import { defaultSortField, flattenCaseSavedObject } from '../../common/utils';
import { Operations } from '../../authorization';
import { buildFilter, buildObservablesFieldsFilter, combineFilters } from '../utils';
import { combineFilterWithAuthorizationFilter } from '../../authorization/utils';
import type { CaseSavedObjectTransformed } from '../../common/types/case';
import { getAvailableObservableTypesSet } from '../observable_types';

interface Similarity {
  typeKey: string;
  value: string;
}

const getSimilarities = (
  a: CaseSavedObjectTransformed,
  b: CaseSavedObjectTransformed,
  availableObservableTypes: Set<string>
): Similarity[] => {
  const stringify = (observable: { typeKey: string; value: string }) =>
    [observable.typeKey, observable.value].join(',');

  const setA = new Set(a.attributes.observables.map(stringify));
  const setB = new Set(b.attributes.observables.map(stringify));

  const intersectingObservables: string[] = intersection([...setA], [...setB]);

  return intersectingObservables
    .map((item) => {
      const [typeKey, value] = item.split(',');

      return {
        typeKey,
        value,
      };
    })
    .filter((observable) => availableObservableTypes.has(observable.typeKey));
};

/**
 * Retrieves cases similar to a given Case
 */
export const similar = async (
  caseId: string,
  params: SimilarCasesSearchRequest,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<CasesSimilarResponse> => {
  const {
    services: { caseService, licensingService },
    logger,
    authorization,
  } = clientArgs;

  const hasPlatinumLicenseOrGreater = await licensingService.isAtLeastPlatinum();

  if (!hasPlatinumLicenseOrGreater) {
    throw Boom.forbidden(
      'In order to use the similar cases feature, you must be subscribed to an Elastic Platinum license'
    );
  }

  try {
    const paramArgs = decodeWithExcessOrThrow(SimilarCasesSearchRequestRt)(params);
    const retrievedCase = await caseService.getCase({ id: caseId });

    const availableObservableTypesSet = await getAvailableObservableTypesSet(
      casesClient,
      retrievedCase.attributes.owner
    );

    if (!retrievedCase.attributes.observables.length) {
      return {
        cases: [],
        page: 1,
        per_page: paramArgs.perPage ?? 0,
        total: 0,
      };
    }

    const ownerFilter = buildFilter({
      filters: retrievedCase.attributes.owner,
      field: OWNER_FIELD,
      operator: 'or',
    });

    const { filter: authorizationFilter, ensureSavedObjectsAreAuthorized } =
      await authorization.getAuthorizationFilter(Operations.findCases);

    const similarCasesFilter = buildObservablesFieldsFilter(
      retrievedCase.attributes.observables.reduce((observableMap, observable) => {
        // NOTE: skip non-existent observable types
        if (!availableObservableTypesSet.has(observable.typeKey)) {
          return observableMap;
        }

        if (!observableMap[observable.typeKey]) {
          observableMap[observable.typeKey] = [];
        }

        observableMap[observable.typeKey].push(observable.value);

        return observableMap;
      }, {} as Record<string, string[]>)
    );

    const filters = combineFilters([similarCasesFilter, ownerFilter]);

    const finalCasesFilter = combineFilterWithAuthorizationFilter(filters, authorizationFilter);

    const cases = await caseService.findCases({
      filter: finalCasesFilter,
      sortField: defaultSortField,
      search: `-"cases:${caseId}"`,
      rootSearchFields: ['_id'],
      page: paramArgs.page,
      perPage: paramArgs.perPage,
    });

    ensureSavedObjectsAreAuthorized(
      cases.saved_objects.map((caseSavedObject) => ({
        id: caseSavedObject.id,
        owner: caseSavedObject.attributes.owner,
      }))
    );

    const res = {
      cases: cases.saved_objects.map((so) => ({
        ...flattenCaseSavedObject({ savedObject: so }),
        similarities: {
          observables: getSimilarities(retrievedCase, so, availableObservableTypesSet),
        },
      })),
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
