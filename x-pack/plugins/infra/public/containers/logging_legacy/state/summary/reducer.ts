/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sortedIndexBy from 'lodash/fp/sortedIndexBy';
import { combineReducers } from 'redux';
import { reducerWithInitialState } from 'typescript-fsa-reducers';

import { LogSummaryBucket } from '../../../../../common/log_summary';
import { TimeScale, TimeUnit } from '../../../../../common/time';
import {
  configureSummary,
  consolidateSummary,
  extendSummaryEnd,
  extendSummaryStart,
  replaceSummary,
} from './actions';

export interface SummaryState {
  buckets: LogSummaryBucket[];
  bucketSize: TimeScale;
  bufferSize: TimeScale;
  end: {
    loading: number;
  };
  start: {
    loading: number;
  };
}

export const initialSummaryState: SummaryState = {
  bucketSize: {
    unit: TimeUnit.Minute,
    value: 10,
  },
  buckets: [],
  bufferSize: {
    unit: TimeUnit.Day,
    value: 1,
  },
  end: {
    loading: 0,
  },
  start: {
    loading: 0,
  },
};

const summaryStartReducer = reducerWithInitialState(initialSummaryState.start)
  .case(replaceSummary.started, (state, { before }) => ({
    loading: before,
  }))
  .case(replaceSummary.done, (state, { params: { before } }) => ({
    loading: state.loading - before,
  }))
  .case(extendSummaryStart.started, (state, { count }) => ({
    loading: state.loading + count,
  }))
  .cases(
    [extendSummaryStart.done, extendSummaryStart.failed],
    (state, { params: { count } }) => ({
      loading: state.loading - count,
    })
  )
  .build();

const summaryEndReducer = reducerWithInitialState(initialSummaryState.end)
  .case(replaceSummary.started, (state, { after }) => ({
    loading: after,
  }))
  .case(replaceSummary.done, (state, { params: { after } }) => ({
    loading: state.loading - after,
  }))
  .cases(
    [extendSummaryEnd.done, extendSummaryEnd.failed],
    (state, { params: { count } }) => ({
      loading: state.loading - count,
    })
  )
  .build();

const summaryBucketsReducer = reducerWithInitialState(
  initialSummaryState.buckets
)
  .case(replaceSummary.done, (state, { result: { buckets } }) => buckets)
  .case(extendSummaryStart.done, (state, { result: { buckets } }) => [
    ...buckets,
    ...state,
  ])
  .case(extendSummaryEnd.done, (state, { result: { buckets } }) => [
    ...state,
    ...buckets,
  ])
  .case(consolidateSummary, (state, { after, before, target }) => {
    const targetIndex = sortedIndexBy('start', { start: target }, state);

    if (targetIndex === null) {
      return state;
    }

    const startIndex = Math.max(targetIndex - before, 0);
    const endIndex = Math.min(targetIndex + after, state.length);
    const consolidatedBuckets = state.slice(startIndex, endIndex);

    return consolidatedBuckets;
  })
  .build();

const summaryBucketSizeReducer = reducerWithInitialState(
  initialSummaryState.bucketSize
).case(configureSummary, (state, { bucketSize }) => bucketSize);

const summaryBufferSizeReducer = reducerWithInitialState(
  initialSummaryState.bufferSize
).case(configureSummary, (state, { bufferSize }) => bufferSize);

export const summaryReducer = combineReducers<SummaryState>({
  bucketSize: summaryBucketSizeReducer,
  buckets: summaryBucketsReducer,
  bufferSize: summaryBufferSizeReducer,
  end: summaryEndReducer,
  start: summaryStartReducer,
});
