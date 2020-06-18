/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';

import { SortFieldOrUndefined } from '../../../common/schemas';

export type TieBreaker<T> = T & {
  tie_breaker_id: string;
};

interface GetSearchAfterWithTieBreakerOptions<T> {
  response: SearchResponse<TieBreaker<T>>;
  sortField: SortFieldOrUndefined;
}

export const getSearchAfterWithTieBreaker = <T>({
  response,
  sortField,
}: GetSearchAfterWithTieBreakerOptions<T>): string[] | undefined => {
  if (response.hits.hits.length === 0) {
    return undefined;
  } else {
    const lastEsElement = response.hits.hits[response.hits.hits.length - 1];
    if (sortField == null) {
      return [lastEsElement._source.tie_breaker_id];
    } else {
      const [[, sortValue]] = Object.entries(lastEsElement._source).filter(
        ([key]) => key === sortField
      );
      if (typeof sortValue === 'string') {
        return [sortValue, lastEsElement._source.tie_breaker_id];
      } else {
        return [lastEsElement._source.tie_breaker_id];
      }
    }
  }
};
