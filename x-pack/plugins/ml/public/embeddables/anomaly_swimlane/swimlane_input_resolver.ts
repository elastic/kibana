/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import { combineLatest, from, Observable, of, Subject } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  pluck,
  shareReplay,
  skipWhile,
  startWith,
  switchMap,
  tap,
} from 'rxjs/operators';
import { CoreStart } from '@kbn/core/public';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { TimeBuckets } from '../../application/util/time_buckets';
import { MlStartDependencies } from '../../plugin';
import {
  ANOMALY_SWIM_LANE_HARD_LIMIT,
  SWIM_LANE_DEFAULT_PAGE_SIZE,
  SWIMLANE_TYPE,
  SwimlaneType,
} from '../../application/explorer/explorer_constants';
import { OverallSwimlaneData } from '../../application/explorer/explorer_utils';
import { isViewBySwimLaneData } from '../../application/explorer/swimlane_container';
import {
  AnomalySwimlaneEmbeddableInput,
  AnomalySwimlaneEmbeddableOutput,
  AnomalySwimlaneServices,
} from '..';
import { processFilters } from '../common/process_filters';
import { CONTROLLED_BY_SWIM_LANE_FILTER } from '../..';
import { getJobsObservable } from '../common/get_jobs_observable';

const FETCH_RESULTS_DEBOUNCE_MS = 500;

export function useSwimlaneInputResolver(
  embeddableInput$: Observable<AnomalySwimlaneEmbeddableInput>,
  onInputChange: (output: Partial<AnomalySwimlaneEmbeddableOutput>) => void,
  refresh: Observable<void>,
  services: [CoreStart, MlStartDependencies, AnomalySwimlaneServices],
  chartWidth: number,
  fromPage: number,
  renderCallbacks: {
    onRenderComplete: () => void;
    onLoading: () => void;
    onError: (error: Error) => void;
  }
): [
  string | undefined,
  OverallSwimlaneData | undefined,
  number,
  (perPage: number) => void,
  TimeBuckets,
  boolean,
  Error | null | undefined
] {
  const [{ uiSettings }, , { anomalyTimelineService, anomalyDetectorService }] = services;

  const [swimlaneData, setSwimlaneData] = useState<OverallSwimlaneData>();
  const [swimlaneType, setSwimlaneType] = useState<SwimlaneType>();
  const [error, setError] = useState<Error | null>();
  const [perPage, setPerPage] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const chartWidth$ = useMemo(() => new Subject<number>(), []);

  const selectedJobs$ = useMemo(() => {
    return getJobsObservable(embeddableInput$, anomalyDetectorService, setError).pipe(
      shareReplay(1)
    );
  }, []);

  const bucketInterval$ = useMemo(() => {
    return combineLatest([
      selectedJobs$,
      chartWidth$,
      embeddableInput$.pipe(pluck('timeRange')),
    ]).pipe(
      skipWhile(([jobs, width]) => !Array.isArray(jobs) || !width),
      tap(([, , timeRange]) => {
        anomalyTimelineService.setTimeRange(timeRange);
      }),
      map(([jobs, width]) => anomalyTimelineService.getSwimlaneBucketInterval(jobs!, width)),
      distinctUntilChanged((prev, curr) => {
        return prev.asSeconds() === curr.asSeconds();
      })
    );
  }, []);

  const fromPage$ = useMemo(() => new Subject<number>(), []);
  const perPage$ = useMemo(() => new Subject<number>(), []);

  const timeBuckets = useMemo(() => {
    return new TimeBuckets({
      'histogram:maxBars': uiSettings.get(UI_SETTINGS.HISTOGRAM_MAX_BARS),
      'histogram:barTarget': uiSettings.get(UI_SETTINGS.HISTOGRAM_BAR_TARGET),
      dateFormat: uiSettings.get('dateFormat'),
      'dateFormat:scaled': uiSettings.get('dateFormat:scaled'),
    });
  }, []);

  useEffect(() => {
    const subscription = combineLatest([
      selectedJobs$,
      embeddableInput$,
      bucketInterval$,
      fromPage$,
      perPage$.pipe(
        startWith(undefined),
        // no need to emit when the initial value has been set
        distinctUntilChanged(
          (prev, curr) => prev === undefined && curr === SWIM_LANE_DEFAULT_PAGE_SIZE
        )
      ),
      refresh.pipe(startWith(null)),
    ])
      .pipe(
        tap(setIsLoading.bind(null, true)),
        debounceTime(FETCH_RESULTS_DEBOUNCE_MS),
        tap(() => {
          renderCallbacks.onLoading();
        }),
        switchMap(([explorerJobs, input, bucketInterval, fromPageInput, perPageFromState]) => {
          if (!explorerJobs) {
            // couldn't load the list of jobs
            return of(undefined);
          }

          const {
            viewBy,
            swimlaneType: swimlaneTypeInput,
            perPage: perPageInput,
            filters,
            query,
            viewMode,
          } = input;

          if (!swimlaneType) {
            setSwimlaneType(swimlaneTypeInput);
          }

          let appliedFilters: any;
          try {
            appliedFilters = processFilters(filters, query, CONTROLLED_BY_SWIM_LANE_FILTER);
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
                if (perPageFromState === undefined) {
                  // set initial pagination from the input or default one
                  setPerPage(perPageInput ?? SWIM_LANE_DEFAULT_PAGE_SIZE);
                }

                if (viewMode === ViewMode.EDIT && perPageFromState !== perPageInput) {
                  // store per page value when the dashboard is in the edit mode
                  onInputChange({ perPage: perPageFromState });
                }

                return from(
                  anomalyTimelineService.loadViewBySwimlane(
                    [],
                    { earliest, latest },
                    explorerJobs,
                    viewBy!,
                    isViewBySwimLaneData(swimlaneData)
                      ? swimlaneData.cardinality
                      : ANOMALY_SWIM_LANE_HARD_LIMIT,
                    perPageFromState ?? perPageInput ?? SWIM_LANE_DEFAULT_PAGE_SIZE,
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
        if (data !== undefined) {
          setError(null);
          setSwimlaneData(data);
          setIsLoading(false);
        }
      });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    fromPage$.next(fromPage);
  }, [fromPage]);

  useEffect(() => {
    if (perPage === undefined) return;
    perPage$.next(perPage);
  }, [perPage]);

  useEffect(() => {
    chartWidth$.next(chartWidth);
  }, [chartWidth]);

  useEffect(() => {
    if (error) {
      renderCallbacks.onError(error);
    }
  }, [error]);

  useEffect(() => {
    if (swimlaneData) {
      renderCallbacks.onRenderComplete();
    }
  }, [swimlaneData]);

  return [
    swimlaneType,
    swimlaneData,
    perPage ?? SWIM_LANE_DEFAULT_PAGE_SIZE,
    setPerPage,
    timeBuckets,
    isLoading,
    error,
  ];
}
