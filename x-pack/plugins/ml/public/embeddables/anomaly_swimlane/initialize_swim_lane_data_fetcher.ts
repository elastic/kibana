/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { TimeRange } from '@kbn/es-query';
import type { PublishesUnifiedSearch } from '@kbn/presentation-publishing';
import type { Observable } from 'rxjs';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  debounceTime,
  from,
  map,
  of,
  shareReplay,
  skipWhile,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import {
  ANOMALY_SWIM_LANE_HARD_LIMIT,
  SWIMLANE_TYPE,
} from '../../application/explorer/explorer_constants';
import type { OverallSwimlaneData } from '../../application/explorer/explorer_utils';
import { isViewBySwimLaneData } from '../../application/explorer/swimlane_container';
import { CONTROLLED_BY_SWIM_LANE_FILTER } from '../../ui_actions/constants';
import { getJobsObservable } from '../common/get_jobs_observable';
import { processFilters } from '../common/process_filters';
import type { AnomalySwimlaneServices } from '../types';
import type { AnomalySwimLaneEmbeddableApi } from './types';

const FETCH_RESULTS_DEBOUNCE_MS = 500;

export const initializeSwimLaneDataFetcher = (
  swimLaneApi: AnomalySwimLaneEmbeddableApi,
  chartWidth$: Observable<number | undefined>,
  dataLoading: BehaviorSubject<boolean | undefined>,
  blockingError: BehaviorSubject<Error | undefined>,
  appliedTimeRange$: Observable<TimeRange | undefined>,
  query$: PublishesUnifiedSearch['query$'],
  filters$: PublishesUnifiedSearch['filters$'],
  refresh$: Observable<void>,
  services: AnomalySwimlaneServices
) => {
  const { anomalyTimelineService, anomalyDetectorService } = services;

  const swimLaneData$ = new BehaviorSubject<OverallSwimlaneData | undefined>(undefined);

  const selectedJobs$ = getJobsObservable(
    swimLaneApi.jobIds.pipe(map((jobIds) => ({ jobIds }))),
    anomalyDetectorService,
    (error) => blockingError.next(error)
  ).pipe(shareReplay(1));

  const swimLaneInput$ = combineLatest({
    jobIds: swimLaneApi.jobIds,
    swimlaneType: swimLaneApi.swimlaneType,
    viewBy: swimLaneApi.viewBy,
    perPage: swimLaneApi.perPage,
    fromPage: swimLaneApi.fromPage,
  });

  const bucketInterval$ = combineLatest([selectedJobs$, chartWidth$, appliedTimeRange$]).pipe(
    skipWhile(([jobs, width]) => {
      return !Array.isArray(jobs) || !width;
    }),
    tap(([, , timeRange]) => {
      anomalyTimelineService.setTimeRange(timeRange!);
    }),
    map(([jobs, width]) => anomalyTimelineService.getSwimlaneBucketInterval(jobs!, width!))
  );

  const subscription = combineLatest([
    selectedJobs$,
    swimLaneInput$,
    query$,
    filters$,
    bucketInterval$,
    refresh$.pipe(startWith(null)),
  ])
    .pipe(
      tap(() => {
        dataLoading.next(true);
      }),
      debounceTime(FETCH_RESULTS_DEBOUNCE_MS),
      switchMap(([explorerJobs, input, query, filters, bucketInterval]) => {
        if (!explorerJobs) {
          // couldn't load the list of jobs
          return of(undefined);
        }

        const { viewBy, swimlaneType, perPage, fromPage } = input;

        let appliedFilters: estypes.QueryDslQueryContainer;
        try {
          if (filters || query) {
            appliedFilters = processFilters(filters, query, CONTROLLED_BY_SWIM_LANE_FILTER);
          }
        } catch (e) {
          // handle query syntax errors
          blockingError.next(e);
          return of(undefined);
        }

        return from(
          anomalyTimelineService.loadOverallData(explorerJobs, undefined, bucketInterval)
        ).pipe(
          switchMap((overallSwimlaneData) => {
            const { earliest, latest } = overallSwimlaneData;

            if (overallSwimlaneData && swimlaneType === SWIMLANE_TYPE.VIEW_BY) {
              const swimlaneData = swimLaneData$.value;

              let swimLaneLimit = ANOMALY_SWIM_LANE_HARD_LIMIT;
              if (isViewBySwimLaneData(swimlaneData) && viewBy === swimlaneData.fieldName) {
                swimLaneLimit = swimlaneData.cardinality;
              }

              return from(
                anomalyTimelineService.loadViewBySwimlane(
                  [],
                  { earliest, latest },
                  explorerJobs,
                  viewBy!,
                  swimLaneLimit,
                  perPage!,
                  fromPage,
                  undefined,
                  appliedFilters,
                  bucketInterval
                )
              ).pipe(
                map((viewBySwimlaneData) => {
                  return {
                    ...viewBySwimlaneData!,
                    earliest,
                    latest,
                  };
                })
              );
            }
            return of(overallSwimlaneData);
          })
        );
      }),
      catchError((error) => {
        blockingError.next(error);
        return of(undefined);
      })
    )
    .subscribe((data) => {
      swimLaneApi.setInterval(data?.interval);

      dataLoading.next(false);
      blockingError.next(undefined);
      swimLaneData$.next(data);
    });

  return {
    swimLaneData$,
    onDestroy: () => {
      subscription.unsubscribe();
    },
  };
};
