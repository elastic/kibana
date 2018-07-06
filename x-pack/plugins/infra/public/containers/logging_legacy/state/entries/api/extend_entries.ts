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
import { extendEntriesEnd, extendEntriesStart } from '../actions';
import { fetchAdjacentEntries } from './fetch_entries';

export const extendEntriesStart$ = (
  postToApi: InfraObservableApi['post'],
  target: LogEntryTime,
  count: number,
  indices: string[],
  fields: LogEntryFieldsMapping
): Observable<Action> => {
  const params = {
    count,
    target,
  };
  return fetchAdjacentEntries(
    postToApi,
    0,
    count,
    fields,
    indices,
    target
  ).pipe(
    map(({ before }) =>
      extendEntriesStart.done({
        params,
        result: {
          logEntries: before,
        },
      })
    ),
    catchError(error => [
      extendEntriesStart.failed({
        error,
        params,
      }),
    ]),
    startWith<Action>(extendEntriesStart.started(params))
  );
};

export const extendEntriesEnd$ = (
  postToApi: InfraObservableApi['post'],
  target: LogEntryTime,
  count: number,
  indices: string[],
  fields: LogEntryFieldsMapping
): Observable<Action> => {
  const params = {
    count,
    target,
  };
  return fetchAdjacentEntries(
    postToApi,
    count,
    0,
    fields,
    indices,
    target
  ).pipe(
    map(({ after }) =>
      extendEntriesEnd.done({
        params,
        result: {
          logEntries: after.slice(1),
        },
      })
    ),
    catchError(error => [
      extendEntriesEnd.failed({
        error,
        params,
      }),
    ]),
    startWith<Action>(extendEntriesEnd.started(params))
  );
};
