/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable, from, EMPTY } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { HttpStart } from 'src/core/public';
import { GlobalSearchResult } from '../../common/types';
import { GlobalSearchFindOptions } from './types';

interface ServerFetchResponse {
  results: GlobalSearchResult[];
}

export const fetchServerResults = (
  http: HttpStart,
  term: string,
  { preference, aborted$ }: GlobalSearchFindOptions
): Observable<GlobalSearchResult[]> => {
  let controller: AbortController | undefined;
  if (aborted$) {
    controller = new AbortController();
    aborted$.subscribe(() => {
      controller!.abort();
    });
  }
  return from(
    http.post<ServerFetchResponse>('/internal/global_search/find', {
      body: JSON.stringify({ term, options: { preference } }),
      signal: controller?.signal,
    })
  ).pipe(
    takeUntil(aborted$ ?? EMPTY),
    map(response => response.results)
  );
};
