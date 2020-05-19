/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';

import { SearchEsListSchema, SortFieldOrUndefined } from '../../../common/schemas';

export type PartialExceptTieBreaker = Partial<SearchEsListSchema> & {
  tie_breaker_id: SearchEsListSchema['tie_breaker_id'];
};

interface GetSearchAfterWithTieBreakerOptions {
  response: SearchResponse<PartialExceptTieBreaker>;
  sortField: SortFieldOrUndefined;
}

export const getSearchAfterWithTieBreaker = ({
  response,
  sortField,
}: GetSearchAfterWithTieBreakerOptions): string[] => {
  const lastEsList = response.hits.hits[response.hits.hits.length - 1];
  if (sortField == null) {
    return [lastEsList._source.tie_breaker_id];
  } else {
    const [[, sortValue]] = Object.entries(lastEsList._source).filter(([key]) => key === sortField);
    if (typeof sortValue === 'string') {
      return [sortValue, lastEsList._source.tie_breaker_id];
    } else {
      return [lastEsList._source.tie_breaker_id];
    }
  }
};
