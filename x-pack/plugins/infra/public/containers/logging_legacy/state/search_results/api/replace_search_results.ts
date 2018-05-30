/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux';
import { Observable } from 'rxjs';
import { catchError, map, startWith } from 'rxjs/operators';

import {
  LogEntryFieldsMapping,
  LogEntryTime,
} from '../../../../../../common/log_entry';
import { InfraObservableApi } from '../../../../../lib/lib';
import {
  replaceNewerSearchResults,
  replaceOlderSearchResults,
  replaceSearchResults,
} from '../actions';
import {
  fetchAdjacentSearchResults$,
  fetchContainedSearchResults$,
} from './fetch_search_results';

export const replaceWithContainedSearchResults$ = (
  postToApi: InfraObservableApi['post'],
  indices: string[],
  fields: LogEntryFieldsMapping,
  start: LogEntryTime,
  end: LogEntryTime,
  query: string
): Observable<Action> => {
  const params = {
    query,
  };
  return fetchContainedSearchResults$(
    postToApi,
    indices,
    fields,
    start,
    end,
    query
  ).pipe(
    map(results =>
      replaceSearchResults.done({
        params,
        result: { results },
      })
    ),
    catchError(error => [replaceSearchResults.failed({ params, error })]),
    startWith<Action>(replaceSearchResults.started(params))
  );
};

export const replaceWithContainedSearchResultsBefore$ = (
  postToApi: InfraObservableApi['post'],
  indices: string[],
  fields: LogEntryFieldsMapping,
  start: LogEntryTime,
  end: LogEntryTime,
  query: string
): Observable<Action> => {
  const params = {
    query,
  };
  return fetchContainedSearchResults$(
    postToApi,
    indices,
    fields,
    start,
    end,
    query
  ).pipe(
    map(results =>
      replaceOlderSearchResults.done({
        params,
        result: { results },
      })
    ),
    catchError(error => [replaceOlderSearchResults.failed({ params, error })]),
    startWith<Action>(replaceOlderSearchResults.started(params))
  );
};

export const replaceWithContainedSearchResultsAfter$ = (
  postToApi: InfraObservableApi['post'],
  indices: string[],
  fields: LogEntryFieldsMapping,
  start: LogEntryTime,
  end: LogEntryTime,
  query: string
): Observable<Action> => {
  const params = {
    query,
  };
  return fetchContainedSearchResults$(
    postToApi,
    indices,
    fields,
    start,
    end,
    query
  ).pipe(
    map(results =>
      replaceNewerSearchResults.done({
        params,
        result: { results },
      })
    ),
    catchError(error => [replaceNewerSearchResults.failed({ params, error })]),
    startWith<Action>(replaceNewerSearchResults.started(params))
  );
};

export const replaceWithOlderSearchResultsBefore$ = (
  postToApi: InfraObservableApi['post'],
  indices: string[],
  fields: LogEntryFieldsMapping,
  target: LogEntryTime,
  count: number,
  query: string
): Observable<Action> => {
  const params = {
    query,
  };
  return fetchAdjacentSearchResults$(
    postToApi,
    indices,
    fields,
    target,
    count,
    0,
    query
  ).pipe(
    map(({ before }) =>
      replaceOlderSearchResults.done({
        params,
        result: { results: before },
      })
    ),
    catchError(error => [replaceOlderSearchResults.failed({ params, error })]),
    startWith<Action>(replaceOlderSearchResults.started(params))
  );
};

export const replaceWithNewerSearchResultsAfter$ = (
  postToApi: InfraObservableApi['post'],
  indices: string[],
  fields: LogEntryFieldsMapping,
  target: LogEntryTime,
  count: number,
  query: string
): Observable<Action> => {
  const params = {
    query,
  };
  return fetchAdjacentSearchResults$(
    postToApi,
    indices,
    fields,
    target,
    0,
    count,
    query
  ).pipe(
    map(({ after }) =>
      replaceNewerSearchResults.done({
        params,
        result: { results: after },
      })
    ),
    catchError(error => [replaceNewerSearchResults.failed({ params, error })]),
    startWith<Action>(replaceNewerSearchResults.started(params))
  );
};
