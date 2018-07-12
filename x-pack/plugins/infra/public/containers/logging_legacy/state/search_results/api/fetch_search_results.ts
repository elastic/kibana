/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  AdjacentSearchResultsApiPostPayload,
  AdjacentSearchResultsApiPostResponse,
  ContainedSearchResultsApiPostPayload,
  ContainedSearchResultsApiPostResponse,
} from '../../../../../../common/http_api';
import { LogEntryFieldsMapping, LogEntryTime } from '../../../../../../common/log_entry';
import { SearchResult } from '../../../../../../common/log_search_result';
import { InfraObservableApi } from '../../../../../lib/lib';

export interface CommonFetchSearchResultsDependencies<State> {
  postToApi$: Observable<InfraObservableApi['post']>;
  selectSourceCoreFields: (state: State) => LogEntryFieldsMapping;
  selectSourceIndices: (state: State) => string[];
}

export type FetchAdjacentSearchResultsResult = Observable<{
  before: SearchResult[];
  after: SearchResult[];
}>;

export const fetchAdjacentSearchResults$ = (
  postToApi: InfraObservableApi['post'],
  indices: string[],
  fields: LogEntryFieldsMapping,
  target: LogEntryTime,
  before: number,
  after: number,
  query: string
): FetchAdjacentSearchResultsResult =>
  postToApi<AdjacentSearchResultsApiPostPayload, AdjacentSearchResultsApiPostResponse>({
    body: {
      after,
      before,
      fields,
      indices,
      query,
      target: {
        tiebreaker: target.tiebreaker,
        time: target.time,
      },
    },
    url: `logging/adjacent-search-results`,
  }).pipe(map(({ response }) => response.results));

export type FetchContainedSearchResultsResult = Observable<SearchResult[]>;

export const fetchContainedSearchResults$ = (
  postToApi: InfraObservableApi['post'],
  indices: string[],
  fields: LogEntryFieldsMapping,
  start: LogEntryTime,
  end: LogEntryTime,
  query: string
): FetchContainedSearchResultsResult =>
  postToApi<ContainedSearchResultsApiPostPayload, ContainedSearchResultsApiPostResponse>({
    body: {
      end: {
        tiebreaker: end.tiebreaker,
        time: end.time,
      },
      fields,
      indices,
      query,
      start: {
        tiebreaker: start.tiebreaker,
        time: start.time,
      },
    },
    url: `logging/contained-search-results`,
  }).pipe(map(({ response }) => response.results));
