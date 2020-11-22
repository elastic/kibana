/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Query } from '@elastic/eui';
import { getSearchTerm, getFieldValueMap, applyAliases } from './query_utils';
import { FilterValues, ParsedSearchParams } from './types';

const knownFilters = ['tag', 'type'];

const aliasMap = {
  tag: ['tags'],
  type: ['types'],
};

export const parseSearchParams = (term: string): ParsedSearchParams => {
  let query: Query;

  try {
    query = Query.parse(term);
  } catch (e) {
    // if the query fails to parse, we just perform the search against the raw search term.
    return {
      term,
      filters: {
        unknowns: {},
      },
    };
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

  const tags = filterValues.get('tag');
  const types = filterValues.get('type');

  return {
    term: searchTerm,
    filters: {
      tags: tags ? valuesToString(tags) : undefined,
      types: types ? valuesToString(types) : undefined,
      unknowns: unknownFilters,
    },
  };
};

const valuesToString = (raw: FilterValues): FilterValues<string> =>
  raw.map((value) => String(value));
