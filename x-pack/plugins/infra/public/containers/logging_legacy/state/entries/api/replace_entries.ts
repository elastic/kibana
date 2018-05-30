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
import { replaceEntries } from '../actions';
import { fetchAdjacentEntries, fetchLatestEntries } from './fetch_entries';

export const replaceEntries$ = (
  postToApi: InfraObservableApi['post'],
  target: LogEntryTime,
  count: number,
  indices: string[],
  fields: LogEntryFieldsMapping
): Observable<Action> => {
  const params = {
    clearEagerly: true,
    count,
  };
  return fetchAdjacentEntries(
    postToApi,
    count,
    count,
    fields,
    indices,
    target
  ).pipe(
    map(({ before, after }) =>
      replaceEntries.done({
        params,
        result: {
          logEntriesAfter: after,
          logEntriesBefore: before,
        },
      })
    ),
    catchError(error => [
      replaceEntries.failed({
        error,
        params,
      }),
    ]),
    startWith<Action>(replaceEntries.started(params))
  );
};

export const replaceEntriesWithLatest$ = (
  postToApi: InfraObservableApi['post'],
  count: number,
  indices: string[],
  fields: LogEntryFieldsMapping,
  clearEagerly: boolean
): Observable<Action> => {
  const params = {
    clearEagerly,
    count,
  };
  return fetchLatestEntries(postToApi, count, indices, fields).pipe(
    map(entries =>
      replaceEntries.done({
        params,
        result: {
          logEntriesAfter: [],
          logEntriesBefore: entries,
        },
      })
    ),
    catchError(error => [
      replaceEntries.failed({
        error,
        params,
      }),
    ]),
    startWith<Action>(replaceEntries.started(params))
  );
};
