/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { TimeBuckets } from '@kbn/ml-time-buckets';
import { useTimeBuckets } from '@kbn/ml-time-buckets';
import { useEffect, useMemo, useState } from 'react';
import type { Observable } from 'rxjs';
import { BehaviorSubject, combineLatest, from, of } from 'rxjs';
import {
  catchError,
  debounceTime,
  map,
  shareReplay,
  skipWhile,
  startWith,
  switchMap,
  tap,
} from 'rxjs/operators';
import type { AnomalySwimlaneServices } from '..';
import { CONTROLLED_BY_SWIM_LANE_FILTER } from '../..';
import type { SwimlaneType } from '../../application/explorer/explorer_constants';
import {
  ANOMALY_SWIM_LANE_HARD_LIMIT,
  SWIMLANE_TYPE,
} from '../../application/explorer/explorer_constants';
import type { OverallSwimlaneData } from '../../application/explorer/explorer_utils';
import { isViewBySwimLaneData } from '../../application/explorer/swimlane_container';
import type { MlStartDependencies } from '../../plugin';
import { getJobsObservable } from '../common/get_jobs_observable';
import { processFilters } from '../common/process_filters';
import type { AnomalySwimLaneEmbeddableApi } from './types';

const FETCH_RESULTS_DEBOUNCE_MS = 500;

export function useSwimlaneInputResolver(
  api: AnomalySwimLaneEmbeddableApi,
  refresh: Observable<void>,
  services: [CoreStart, MlStartDependencies, AnomalySwimlaneServices],
  chartWidth: number,
  reportingCallbacks: {
    onLoading: () => void;
    onError: (error: Error) => void;
  }
): [
  string | undefined,
  OverallSwimlaneData | undefined,
  TimeBuckets,
  boolean,
  Error | null | undefined
] {
  const [{ uiSettings }, , { anomalyTimelineService, anomalyDetectorService }] = services;

  const timeBuckets = useTimeBuckets(uiSettings);

  const [swimlaneData, setSwimlaneData] = useState<OverallSwimlaneData>();
  const [swimlaneType, setSwimlaneType] = useState<SwimlaneType>();
  const [error, setError] = useState<Error | null>();
  const [isLoading, setIsLoading] = useState(false);

  const chartWidth$ = useMemo(() => new BehaviorSubject<number>(0), []);

  const embeddableInput$ = useMemo(() => {
    return combineLatest({
      jobIds: api.jobIds,
      swimlaneType: api.swimlaneType,
      viewBy: api.viewBy,
      perPage: api.perPage,
      fromPage: api.fromPage,
    });
  }, [api]);

  const selectedJobs$ = useMemo(() => {
    return getJobsObservable(
      api.jobIds.pipe(
        map((v) => {
          return { jobIds: v };
        })
      ),
      anomalyDetectorService,
      setError
    ).pipe(shareReplay(1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bucketInterval$ = useMemo(() => {
    return combineLatest([selectedJobs$, chartWidth$, api.appliedTimeRange$]).pipe(
      skipWhile(([jobs, width]) => {
        return !Array.isArray(jobs) || !width;
      }),
      tap(([, , timeRange]) => {
        anomalyTimelineService.setTimeRange(timeRange);
      }),
      map(([jobs, width]) => anomalyTimelineService.getSwimlaneBucketInterval(jobs!, width))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const subscription = combineLatest([
      selectedJobs$,
      embeddableInput$,
      api.query$,
      api.filters$,
      bucketInterval$,
      refresh.pipe(startWith(null)),
    ])
      .pipe(
        tap(setIsLoading.bind(null, true)),
        debounceTime(FETCH_RESULTS_DEBOUNCE_MS),
        tap(() => {
          reportingCallbacks.onLoading();
        }),
        switchMap(([explorerJobs, input, query, filters, bucketInterval]) => {
          if (!explorerJobs) {
            // couldn't load the list of jobs
            return of(undefined);
          }

          const {
            viewBy,
            swimlaneType: swimlaneTypeInput,
            perPage: perPageInput,
            fromPage: fromPageInput,
          } = input;

          if (!swimlaneType) {
            setSwimlaneType(swimlaneTypeInput);
          }

          let appliedFilters: any;
          try {
            if (filters || query) {
              appliedFilters = processFilters(filters, query, CONTROLLED_BY_SWIM_LANE_FILTER);
            }
          } catch (e) {
            // handle query syntax errors
            setError(e);
            return of(undefined);
          }

          return from(
            anomalyTimelineService.loadOverallData(explorerJobs, undefined, bucketInterval)
          ).pipe(
            switchMap((overallSwimlaneData) => {
              const { earliest, latest } = overallSwimlaneData;

              if (overallSwimlaneData && swimlaneTypeInput === SWIMLANE_TYPE.VIEW_BY) {
                return from(
                  anomalyTimelineService.loadViewBySwimlane(
                    [],
                    { earliest, latest },
                    explorerJobs,
                    viewBy!,
                    isViewBySwimLaneData(swimlaneData)
                      ? swimlaneData.cardinality
                      : ANOMALY_SWIM_LANE_HARD_LIMIT,
                    perPageInput!,
                    fromPageInput,
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
        catchError((e) => {
          setError(e.body);
          return of(undefined);
        })
      )
      .subscribe((data) => {
        api.setInterval(data?.interval);
        if (data !== undefined) {
          setError(null);
          setSwimlaneData(data);
          setIsLoading(false);
        }
      });

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    chartWidth$.next(chartWidth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartWidth]);

  useEffect(() => {
    if (error) {
      reportingCallbacks.onError(error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  return [swimlaneType, swimlaneData, timeBuckets, isLoading, error];
}
