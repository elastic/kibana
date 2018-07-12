/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux';
import { Observable } from 'rxjs';
import { catchError, map, startWith } from 'rxjs/operators';

import { LogEntryFieldsMapping } from '../../../../../../common/log_entry';
import { TimeScale } from '../../../../../../common/time';
import { InfraObservableApi } from '../../../../../lib/lib';
import { replaceSearchSummary } from '../actions';
import { fetchSearchSummary$ } from './fetch_search_summary';

export const replaceSearchSummary$ = (
  postToApi: InfraObservableApi['post'],
  indices: string[],
  fields: LogEntryFieldsMapping,
  start: number,
  end: number,
  bucketSize: TimeScale,
  query: string
): Observable<Action> => {
  const params = {
    query,
  };
  return fetchSearchSummary$(postToApi, indices, fields, start, end, bucketSize, query).pipe(
    map(buckets =>
      replaceSearchSummary.done({
        params,
        result: { buckets },
      })
    ),
    catchError(error => [replaceSearchSummary.failed({ params, error })]),
    startWith<Action>(replaceSearchSummary.started(params))
  );
};
