/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller } from 'kibana/server';

import { Filter, SortFieldOrUndefined, SortOrderOrUndefined } from '../../../common/schemas';
import { Scroll } from '../lists/types';

import { getQueryFilter } from './get_query_filter';
import { getSortWithTieBreaker } from './get_sort_with_tie_breaker';
import { getSourceWithTieBreaker } from './get_source_with_tie_breaker';
import { TieBreaker, getSearchAfterWithTieBreaker } from './get_search_after_with_tie_breaker';

interface GetSearchAfterOptions {
  callCluster: LegacyAPICaller;
  filter: Filter;
  hops: number;
  hopSize: number;
  searchAfter: string[] | undefined;
  index: string;
  sortField: SortFieldOrUndefined;
  sortOrder: SortOrderOrUndefined;
}

export const getSearchAfterScroll = async <T>({
  callCluster,
  filter,
  hopSize,
  hops,
  searchAfter,
  sortField,
  sortOrder,
  index,
}: GetSearchAfterOptions): Promise<Scroll> => {
  const query = getQueryFilter({ filter });
  let newSearchAfter = searchAfter;
  for (let i = 0; i < hops; ++i) {
    const response = await callCluster<TieBreaker<T>>('search', {
      body: {
        _source: getSourceWithTieBreaker({ sortField }),
        query,
        search_after: newSearchAfter,
        sort: getSortWithTieBreaker({ sortField, sortOrder }),
      },
      ignoreUnavailable: true,
      index,
      size: hopSize,
    });
    if (response.hits.hits.length > 0) {
      newSearchAfter = getSearchAfterWithTieBreaker({ response, sortField });
    } else {
      return {
        searchAfter: undefined,
        validSearchAfterFound: false,
      };
    }
  }
  return {
    searchAfter: newSearchAfter,
    validSearchAfterFound: true,
  };
};
