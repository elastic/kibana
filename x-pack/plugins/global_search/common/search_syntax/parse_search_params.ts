/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-expect-error need nested import, as this is also used on the server-side.
//                  importing from eui entrypoint causes errors.
import { Query } from '@elastic/eui/lib/components/search_bar/query';
import { getSearchTerm, getFieldValueMap, applyAliases } from './query_utils';
import { FilterValues, GlobalSearchProviderFindParams } from './types';

const knownFilters = ['tag', 'type'];

const aliasMap = {
  tag: ['tags'],
  type: ['types'],
};

export const parseSearchParams = (term: string): GlobalSearchProviderFindParams => {
  let query: Query;

  try {
    query = Query.parse(term);
  } catch (e) {
    // TODO: what to return?
    throw e;
  }

  const searchTerm = getSearchTerm(query);
  const filterValues = applyAliases(getFieldValueMap(query), aliasMap);

  const unknownFilters = [...filterValues.entries()]
    .filter(([key]) => !knownFilters.includes(key))
    .reduce((unknowns, [key, value]) => {
      return {
        ...unknowns,
        [key]: value,
      };
    }, {} as Record<string, FilterValues>);

  return {
    term: searchTerm,
    raw: term,
    filters: {
      tags: filterValues.get('tag') as FilterValues<string>,
      types: filterValues.get('type') as FilterValues<string>,
      unknowns: unknownFilters,
    },
  };
};
