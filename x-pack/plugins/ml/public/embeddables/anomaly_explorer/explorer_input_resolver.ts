/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import { combineLatest, forkJoin, from, Observable, of, Subject } from 'rxjs';
import { isEqual } from 'lodash';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  mergeMap,
  pluck,
  skipWhile,
  startWith,
  switchMap,
  tap,
} from 'rxjs/operators';
import { CoreStart } from 'kibana/public';
import { TimeBuckets } from '../../application/util/time_buckets';
import { MlStartDependencies } from '../../plugin';
import { SwimlaneType } from '../../application/explorer/explorer_constants';
import { Filter } from '../../../../../../src/plugins/data/common/es_query/filters';
import { Query } from '../../../../../../src/plugins/data/common/query';
import { esKuery, UI_SETTINGS } from '../../../../../../src/plugins/data/public';
import {
  AppStateSelectedCells,
  ExplorerJob,
  getSelectionInfluencers,
  getSelectionJobIds,
  getSelectionTimeRange,
  loadDataForCharts,
} from '../../application/explorer/explorer_utils';
import { parseInterval } from '../../../common/util/parse_interval';
import { AnomalyDetectorService } from '../../application/services/anomaly_detector_service';
import { CONTROLLED_BY_SWIM_LANE_FILTER } from '../../ui_actions/constants';
import {
  AnomalyExplorerEmbeddableInput,
  AnomalyExplorerEmbeddableOutput,
  AnomalyExplorerServices,
} from '..';
import type { CombinedJob } from '../../../common/types/anomaly_detection_jobs';
import type { AnomalyChartData } from '../../application/services/anomaly_explorer_service';

const FETCH_RESULTS_DEBOUNCE_MS = 500;

function getJobsObservable(
  embeddableInput: Observable<AnomalyExplorerEmbeddableInput>,
  anomalyDetectorService: AnomalyDetectorService,
  setErrorHandler: (e: Error) => void
) {
  return embeddableInput.pipe(
    pluck('jobIds'),
    distinctUntilChanged(isEqual),
    switchMap((jobsIds) => anomalyDetectorService.getJobs$(jobsIds)),
    catchError((e) => {
      setErrorHandler(e.body ?? e);
      return of(undefined);
    })
  );
}

export function useExplorerInputResolver(
  embeddableInput: Observable<AnomalyExplorerEmbeddableInput>,
  onInputChange: (output: Partial<AnomalyExplorerEmbeddableOutput>) => void,
  refresh: Observable<any>,
  services: [CoreStart, MlStartDependencies, AnomalyExplorerServices],
  chartWidth: number,
  severity: number
): { chartsData: AnomalyChartData; isLoading: boolean; error: Error | null | undefined } {
  const [
    { uiSettings },
    { data: dataServices },
    { anomalyTimelineService, anomalyDetectorService, anomalyExplorerService },
  ] = services;
  const { timefilter } = dataServices.query.timefilter;

  const [chartsData, setChartsData] = useState<any>();
  const [swimlaneType, setSwimlaneType] = useState<SwimlaneType>();
  const [error, setError] = useState<Error | null>();
  const [isLoading, setIsLoading] = useState(false);

  const chartWidth$ = useMemo(() => new Subject<number>(), []);
  // const selectedCells$ = useMemo(() => new Subject<AppStateSelectedCells | undefined>(), []);
  const severity$ = useMemo(() => new Subject<number>(), []);

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
      getJobsObservable(embeddableInput, anomalyDetectorService, setError),
      embeddableInput,
      chartWidth$.pipe(skipWhile((v) => !v)),
      // selectedCells$,
      severity$,
      refresh.pipe(startWith(null)),
    ])
      .pipe(
        tap(setIsLoading.bind(null, true)),
        debounceTime(FETCH_RESULTS_DEBOUNCE_MS),
        switchMap(([jobs, input, swimlaneContainerWidth, severityValue]) => {
          if (!jobs) {
            // couldn't load the list of jobs
            return of(undefined);
          }
          const {
            viewBy,
            swimlaneType: swimlaneTypeInput,
            maxSeriesToPlot,
            timeRange,
            filters,
            query,
          } = input;

          const viewBySwimlaneFieldName = viewBy;

          anomalyTimelineService.setTimeRange(timeRange);

          if (!swimlaneType) {
            setSwimlaneType(swimlaneTypeInput);
          }

          const explorerJobs: ExplorerJob[] = jobs.map((job) => {
            const bucketSpan = parseInterval(job.analysis_config.bucket_span);
            return {
              id: job.job_id,
              selected: true,
              bucketSpanSeconds: bucketSpan!.asSeconds(),
            };
          });

          if (viewBySwimlaneFieldName !== undefined) {
            let influencersFilterQuery: any;
            try {
              influencersFilterQuery = processFilters(filters, query);
            } catch (e) {
              // handle query syntax errors
              setError(e);
              return of(undefined);
            }

            const bounds = anomalyTimelineService.getTimeBounds();
            // Can be from input timerange or from the timefilter query bar
            const selections: AppStateSelectedCells = {
              lanes: ['Overall'],
              times: [bounds.min?.unix()!, bounds.max?.unix()!],
              type: 'overall',
            };

            const selectionInfluencers = getSelectionInfluencers(
              selections,
              viewBySwimlaneFieldName!
            );

            const jobIds = getSelectionJobIds(selections, explorerJobs);

            const swimlaneBucketInterval = timeBuckets.getInterval();

            const timerange = getSelectionTimeRange(
              selections,
              swimlaneBucketInterval.asSeconds(),
              bounds
            );
            const explorer$ = forkJoin({
              combinedJobs: anomalyExplorerService.getCombinedJobs(jobIds),
              anomalyChartRecords: loadDataForCharts(
                jobIds,
                timerange.earliestMs,
                timerange.latestMs,
                selectionInfluencers,
                selections,
                influencersFilterQuery
              ),
            }).pipe(
              mergeMap(({ combinedJobs, anomalyChartRecords }) => {
                const combinedJobRecords: Record<
                  string,
                  CombinedJob
                > = (combinedJobs as CombinedJob[]).reduce((acc, job) => {
                  return { ...acc, [job.job_id]: job };
                }, {});

                return forkJoin({
                  chartsData: from(
                    anomalyExplorerService.getAnomalyData(
                      combinedJobRecords,
                      swimlaneContainerWidth,
                      // @ts-ignore
                      anomalyChartRecords,
                      timerange.earliestMs,
                      timerange.latestMs,
                      timefilter,
                      severityValue,
                      maxSeriesToPlot
                    )
                  ),
                });
              })
            );
            return explorer$;
          }
        }),
        catchError((e) => {
          setError(e.body);
          return of(undefined);
        })
      )
      .subscribe((results) => {
        if (results !== undefined) {
          setError(null);
          setChartsData(results.chartsData);
          setIsLoading(false);
        }
      });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // useEffect(() => {
  //   if (selectedCells === undefined) return;
  //   selectedCells$.next(selectedCells);
  // }, [selectedCells]);

  useEffect(() => {
    chartWidth$.next(chartWidth);
  }, [chartWidth]);

  useEffect(() => {
    severity$.next(severity);
  }, [severity]);

  return { chartsData, isLoading, error };
}

export function processFilters(filters: Filter[], query: Query) {
  const inputQuery =
    query.language === 'kuery'
      ? esKuery.toElasticsearchQuery(esKuery.fromKueryExpression(query.query as string))
      : query.query;

  const must = [inputQuery];
  const mustNot = [];
  for (const filter of filters) {
    // ignore disabled filters as well as created by swim lane selection
    if (filter.meta.disabled || filter.meta.controlledBy === CONTROLLED_BY_SWIM_LANE_FILTER)
      continue;

    const {
      meta: { negate, type, key: fieldName },
    } = filter;

    let filterQuery = filter.query;

    if (filterQuery === undefined && type === 'exists') {
      filterQuery = {
        exists: {
          field: fieldName,
        },
      };
    }

    if (negate) {
      mustNot.push(filterQuery);
    } else {
      must.push(filterQuery);
    }
  }
  return {
    bool: {
      must,
      must_not: mustNot,
    },
  };
}
