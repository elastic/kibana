/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux';
import { Epic } from 'redux-observable';
import { merge } from 'rxjs';
import {
  catchError,
  exhaustMap,
  filter,
  map,
  startWith,
  switchMap,
  takeUntil,
  withLatestFrom,
} from 'rxjs/operators';

import { LogEntryTime } from '../../../../../common/log_entry';
import { LogSummaryBucket } from '../../../../../common/log_summary';
import { getMillisOfScale, TimeScale } from '../../../../../common/time';
import { targetActions } from '../target';
import {
  configureSummary,
  consolidateSummary,
  extendSummaryEnd,
  extendSummaryStart,
  replaceSummary,
  ReplaceSummaryPayload,
  reportVisibleSummary,
} from './actions';
import {
  CommonFetchSummaryDependencies,
  fetchSummary,
  FetchSummaryResult,
} from './api/fetch_summary';

const MIN_CHUNK_SIZE = 10;

interface ManageSummaryDependencies<State extends {}>
  extends CommonFetchSummaryDependencies<State> {
  selectFirstSummaryBucket: (state: State) => LogSummaryBucket | null;
  selectLastSummaryBucket: (state: State) => LogSummaryBucket | null;
  selectTarget: (state: State) => LogEntryTime;
  selectSummaryBucketsPerBuffer: (state: State) => number;
  selectSummaryBucketSize: (state: State) => TimeScale;
}

export const createSummaryEpic = <State>(): Epic<
  Action,
  Action,
  State,
  ManageSummaryDependencies<State>
> => (
  action$,
  state$,
  {
    postToApi$,
    selectFirstSummaryBucket,
    selectLastSummaryBucket,
    selectTarget,
    selectSummaryBucketSize,
    selectSummaryBucketsPerBuffer,
    selectSourceCoreFields,
    selectSourceIndices,
  }
) =>
  merge(
    action$.pipe(
      filter(targetActions.jumpToTarget.match),
      withLatestFrom(postToApi$),
      switchMap(([{ payload: target }, postToApi]) => {
        const state = state$.value;
        const firstSummaryBucket = selectFirstSummaryBucket(state);
        const lastSummaryBucket = selectLastSummaryBucket(state);
        const summaryBucketSize = selectSummaryBucketSize(state);
        const summaryBucketsPerBuffer = selectSummaryBucketsPerBuffer(state);

        const isLocalJump =
          firstSummaryBucket !== null &&
          lastSummaryBucket !== null &&
          firstSummaryBucket.start < target.time &&
          lastSummaryBucket.end > target.time;

        const desiredBucketsAroundTarget = Math.max(
          Math.ceil(1.5 * summaryBucketsPerBuffer),
          MIN_CHUNK_SIZE
        );

        if (isLocalJump) {
          return [
            consolidateSummary({
              after: desiredBucketsAroundTarget,
              before: desiredBucketsAroundTarget,
              target: target.time,
            }),
          ];
        } else {
          return fetchSummary(
            postToApi,
            desiredBucketsAroundTarget,
            desiredBucketsAroundTarget,
            {
              time: selectSourceCoreFields(state).time,
            },
            selectSourceIndices(state),
            target.time,
            summaryBucketSize
          ).pipe(
            handleReplaceSummary({
              after: desiredBucketsAroundTarget,
              before: desiredBucketsAroundTarget,
              bucketSize: summaryBucketSize,
              target: target.time,
            })
          );
        }
      })
    ),
    action$.pipe(
      filter(configureSummary.match),
      withLatestFrom(postToApi$),
      switchMap(([summaryConfiguration, postToApi]) => {
        const state = state$.value;
        const summaryBucketSize = selectSummaryBucketSize(state);
        const summaryBucketsPerBuffer = selectSummaryBucketsPerBuffer(state);
        const target = selectTarget(state);

        const desiredBucketsAroundTarget = Math.max(
          Math.ceil(1.5 * summaryBucketsPerBuffer),
          MIN_CHUNK_SIZE
        );

        return fetchSummary(
          postToApi,
          desiredBucketsAroundTarget,
          desiredBucketsAroundTarget,
          {
            time: selectSourceCoreFields(state).time,
          },
          selectSourceIndices(state),
          target.time,
          summaryBucketSize
        ).pipe(
          handleReplaceSummary({
            after: desiredBucketsAroundTarget,
            before: desiredBucketsAroundTarget,
            bucketSize: summaryBucketSize,
            target: target.time,
          })
        );
      })
    ),
    action$.pipe(
      filter(reportVisibleSummary.match),
      withLatestFrom(postToApi$),
      exhaustMap(([{ payload: { start } }, postToApi]) => {
        const state = state$.value;
        const firstSummaryBucket = selectFirstSummaryBucket(state);
        const summaryBucketSize = selectSummaryBucketSize(state);
        const summaryBucketsPerBuffer = selectSummaryBucketsPerBuffer(state);

        if (firstSummaryBucket === null) {
          return [];
        }

        const summaryBucketSizeMillis = getMillisOfScale(summaryBucketSize);
        const currentBucketsInBuffer = Math.ceil(
          (start - firstSummaryBucket.start) / summaryBucketSizeMillis
        );

        const missingBuckets = Math.ceil(summaryBucketsPerBuffer - currentBucketsInBuffer);

        if (missingBuckets <= 0) {
          return [];
        }

        const chunkSize = Math.max(MIN_CHUNK_SIZE, missingBuckets);
        const target = firstSummaryBucket.start;
        const params = {
          bucketSize: summaryBucketSize,
          count: chunkSize,
          target,
        };
        return fetchSummary(
          postToApi,
          0,
          chunkSize,
          {
            time: selectSourceCoreFields(state).time,
          },
          selectSourceIndices(state),
          target,
          summaryBucketSize
        ).pipe(
          map(buckets =>
            extendSummaryStart.done({
              params,
              result: {
                buckets,
              },
            })
          ),
          catchError(error => [
            extendSummaryStart.failed({
              error,
              params,
            }),
          ]),
          startWith<Action>(extendSummaryStart.started(params)),
          takeUntil(action$.pipe(filter(replaceSummary.started.match)))
        );
      })
    ),
    action$.pipe(
      filter(reportVisibleSummary.match),
      withLatestFrom(postToApi$),
      exhaustMap(([{ payload: { end } }, postToApi]) => {
        const state = state$.value;
        const lastSummaryBucket = selectLastSummaryBucket(state);
        const summaryBucketSize = selectSummaryBucketSize(state);
        const summaryBucketsPerBuffer = selectSummaryBucketsPerBuffer(state);

        if (lastSummaryBucket === null) {
          return [];
        }

        const summaryBucketSizeMillis = getMillisOfScale(summaryBucketSize);
        const currentBucketsInBuffer = Math.ceil(
          (lastSummaryBucket.end - end) / summaryBucketSizeMillis
        );

        const missingBuckets = Math.ceil(summaryBucketsPerBuffer - currentBucketsInBuffer);

        if (missingBuckets <= 0) {
          return [];
        }

        const chunkSize = Math.max(MIN_CHUNK_SIZE, missingBuckets);
        const target = lastSummaryBucket.end;
        const params = {
          bucketSize: summaryBucketSize,
          count: chunkSize,
          target,
        };
        return fetchSummary(
          postToApi,
          chunkSize,
          0,
          {
            time: selectSourceCoreFields(state).time,
          },
          selectSourceIndices(state),
          target,
          summaryBucketSize
        ).pipe(
          map(buckets =>
            extendSummaryEnd.done({
              params,
              result: {
                buckets,
              },
            })
          ),
          catchError(error => [
            extendSummaryEnd.failed({
              error,
              params,
            }),
          ]),
          startWith<Action>(extendSummaryEnd.started(params)),
          takeUntil(action$.pipe(filter(replaceSummary.started.match)))
        );
      })
    )
  );

const handleReplaceSummary = (params: ReplaceSummaryPayload) => (request$: FetchSummaryResult) =>
  request$.pipe(
    map(buckets =>
      replaceSummary.done({
        params,
        result: {
          buckets,
        },
      })
    ),
    catchError(error => [
      replaceSummary.failed({
        error,
        params,
      }),
    ]),
    startWith<Action>(replaceSummary.started(params))
  );
