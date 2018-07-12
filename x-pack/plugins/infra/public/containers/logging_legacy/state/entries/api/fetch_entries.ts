/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  AdjacentLogEntriesApiPostPayload,
  AdjacentLogEntriesApiPostResponse,
  LatestLogEntriesApiPostPayload,
  LatestLogEntriesApiPostResponse,
} from '../../../../../../common/http_api';
import { LogEntry, LogEntryFieldsMapping, LogEntryTime } from '../../../../../../common/log_entry';
import { InfraObservableApi } from '../../../../../lib/lib';

export interface CommonFetchEntriesDependencies<State> {
  postToApi$: Observable<InfraObservableApi['post']>;
  selectSourceCoreFields: (state: State) => LogEntryFieldsMapping;
  selectSourceIndices: (state: State) => string[];
}

export type FetchAdjacentEntriesResult = Observable<{
  after: LogEntry[];
  before: LogEntry[];
}>;

export const fetchAdjacentEntries = (
  postToApi: InfraObservableApi['post'],
  after: number,
  before: number,
  fields: LogEntryFieldsMapping,
  indices: string[],
  target: LogEntryTime
): FetchAdjacentEntriesResult =>
  postToApi<AdjacentLogEntriesApiPostPayload, AdjacentLogEntriesApiPostResponse>({
    body: {
      after,
      before,
      fields,
      indices,
      target: {
        tiebreaker: target.tiebreaker,
        time: target.time,
      },
    },
    url: `logging/adjacent-entries`,
  }).pipe(map(({ response }) => response.entries));

export type FetchLatestEntriesResult = Observable<LogEntry[]>;

export const fetchLatestEntries = (
  postToApi: InfraObservableApi['post'],
  count: number,
  indices: string[],
  fields: LogEntryFieldsMapping
): FetchLatestEntriesResult =>
  postToApi<LatestLogEntriesApiPostPayload, LatestLogEntriesApiPostResponse>({
    body: {
      count,
      fields,
      indices,
    },
    url: `logging/latest-entries`,
  }).pipe(map(({ response }) => response.entries));
