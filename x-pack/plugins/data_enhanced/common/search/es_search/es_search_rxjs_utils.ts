/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { interval, of, merge } from 'rxjs';
import { concatMap, takeWhile } from 'rxjs/operators';

import { doSearch, IKibanaSearchRequest } from '../../../../../../src/plugins/data/common';
import { IAsyncSearchOptions } from '../../../common/search/types';

const DEFAULT_POLLING_INTERVAL = 1000;

export const doPartialSearch = <SearchResponse = any>(
  searchMethod: () => Promise<SearchResponse>,
  partialSearchMethod: (id: IKibanaSearchRequest['id']) => Promise<SearchResponse>,
  isCompleted: (response: SearchResponse) => boolean,
  getId: (response: SearchResponse) => IKibanaSearchRequest['id'],
  requestId: IKibanaSearchRequest['id'],
  { abortSignal, pollInterval, waitForCompletion }: IAsyncSearchOptions
) => {
  const partialSearch = (id: IKibanaSearchRequest['id']) => {
    if (waitForCompletion) {
      return interval(pollInterval ?? DEFAULT_POLLING_INTERVAL).pipe(
        concatMap(() => doSearch<SearchResponse>(() => partialSearchMethod(id), abortSignal)),
        takeWhile((response) => !isCompleted(response), true)
      );
    } else {
      return doSearch<SearchResponse>(() => partialSearchMethod(id), abortSignal);
    }
  };

  return requestId
    ? partialSearch(requestId)
    : doSearch<SearchResponse>(searchMethod, abortSignal).pipe(
        concatMap((response) =>
          waitForCompletion && !isCompleted(response)
            ? merge(of(response), partialSearch(getId(response)))
            : of(response)
        )
      );
};
