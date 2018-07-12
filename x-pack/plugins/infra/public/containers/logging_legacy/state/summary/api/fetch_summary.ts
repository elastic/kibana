/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  LogSummaryApiPostPayload,
  LogSummaryApiPostResponse,
} from '../../../../../../common/http_api';
import { LogSummaryBucket } from '../../../../../../common/log_summary';
import { getElasticSearchTimeUnit, TimeScale } from '../../../../../../common/time';
import { InfraObservableApi } from '../../../../../lib/lib';

export interface CommonFetchSummaryDependencies<State> {
  postToApi$: Observable<InfraObservableApi['post']>;
  selectSourceCoreFields: (
    state: State
  ) => {
    time: string;
  };
  selectSourceIndices: (state: State) => string[];
}

export type FetchSummaryResult = Observable<LogSummaryBucket[]>;

export const fetchSummary = (
  postToApi: InfraObservableApi['post'],
  after: number,
  before: number,
  fields: {
    time: string;
  },
  indices: string[],
  target: number,
  bucketSize: TimeScale
): FetchSummaryResult =>
  postToApi<LogSummaryApiPostPayload, LogSummaryApiPostResponse>({
    body: {
      after,
      before,
      bucketSize: {
        unit: getElasticSearchTimeUnit(bucketSize.unit),
        value: bucketSize.value,
      },
      fields,
      indices,
      target,
    },
    url: `logging/summary`,
  }).pipe(map(({ response }) => response.buckets));
