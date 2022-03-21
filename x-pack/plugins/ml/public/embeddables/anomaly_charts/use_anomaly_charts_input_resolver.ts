/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import { combineLatest, forkJoin, from, Observable, of, Subject } from 'rxjs';
import { catchError, debounceTime, skipWhile, startWith, switchMap, tap } from 'rxjs/operators';
import { CoreStart } from 'kibana/public';
import { MlStartDependencies } from '../../plugin';
import {
  AppStateSelectedCells,
  getSelectionInfluencers,
  getSelectionJobIds,
  getSelectionTimeRange,
} from '../../application/explorer/explorer_utils';
import { OVERALL_LABEL, SWIMLANE_TYPE } from '../../application/explorer/explorer_constants';
import {
  AnomalyChartsEmbeddableInput,
  AnomalyChartsEmbeddableOutput,
  AnomalyChartsServices,
} from '..';
import type { CombinedJob } from '../../../common/types/anomaly_detection_jobs';
import type { ExplorerChartsData } from '../../application/explorer/explorer_charts/explorer_charts_container_service';
import { processFilters } from '../common/process_filters';
import { InfluencersFilterQuery } from '../../../common/types/es_client';
import { getJobsObservable } from '../common/get_jobs_observable';

const FETCH_RESULTS_DEBOUNCE_MS = 500;

export function useAnomalyChartsInputResolver(
  embeddableInput: Observable<AnomalyChartsEmbeddableInput>,
  onInputChange: (output: Partial<AnomalyChartsEmbeddableOutput>) => void,
  refresh: Observable<any>,
  services: [CoreStart, MlStartDependencies, AnomalyChartsServices],
  chartWidth: number,
  severity: number
): { chartsData: ExplorerChartsData; isLoading: boolean; error: Error | null | undefined } {
  const [{}, { data: dataServices }, { anomalyDetectorService, anomalyExplorerService }] = services;
  const { timefilter } = dataServices.query.timefilter;

  const [chartsData, setChartsData] = useState<any>();
  const [error, setError] = useState<Error | null>();
  const [isLoading, setIsLoading] = useState(false);

  const chartWidth$ = useMemo(() => new Subject<number>(), []);
  const severity$ = useMemo(() => new Subject<number>(), []);

  useEffect(() => {
    const subscription = combineLatest([
      getJobsObservable(embeddableInput, anomalyDetectorService, setError),
      embeddableInput,
      chartWidth$.pipe(skipWhile((v) => !v)),
      severity$,
      refresh.pipe(startWith(null)),
    ])
      .pipe(
        tap(setIsLoading.bind(null, true)),
        debounceTime(FETCH_RESULTS_DEBOUNCE_MS),
        switchMap(([explorerJobs, input, embeddableContainerWidth, severityValue]) => {
          if (!explorerJobs) {
            // couldn't load the list of jobs
            return of(undefined);
          }

          const { maxSeriesToPlot, timeRange: timeRangeInput, filters, query } = input;

          const viewBySwimlaneFieldName = OVERALL_LABEL;

          anomalyExplorerService.setTimeRange(timeRangeInput);

          let influencersFilterQuery: InfluencersFilterQuery;
          try {
            influencersFilterQuery = processFilters(filters, query);
          } catch (e) {
            // handle query syntax errors
            setError(e);
            return of(undefined);
          }

          const bounds = anomalyExplorerService.getTimeBounds();

          // Can be from input time range or from the timefilter bar
          const selections: AppStateSelectedCells = {
            lanes: [OVERALL_LABEL],
            times: [bounds.min?.unix()!, bounds.max?.unix()!],
            type: SWIMLANE_TYPE.OVERALL,
          };

          const selectionInfluencers = getSelectionInfluencers(selections, viewBySwimlaneFieldName);

          const jobIds = getSelectionJobIds(selections, explorerJobs);

          const timeRange = getSelectionTimeRange(selections, bounds);
          return forkJoin({
            combinedJobs: anomalyExplorerService.getCombinedJobs(jobIds),
            anomalyChartRecords: anomalyExplorerService.loadDataForCharts$(
              jobIds,
              timeRange.earliestMs,
              timeRange.latestMs,
              selectionInfluencers,
              selections,
              influencersFilterQuery
            ),
          }).pipe(
            switchMap(({ combinedJobs, anomalyChartRecords }) => {
              const combinedJobRecords: Record<string, CombinedJob> = (
                combinedJobs as CombinedJob[]
              ).reduce((acc, job) => {
                return { ...acc, [job.job_id]: job };
              }, {});

              return forkJoin({
                chartsData: from(
                  anomalyExplorerService.getAnomalyData(
                    undefined,
                    combinedJobRecords,
                    embeddableContainerWidth,
                    anomalyChartRecords,
                    timeRange.earliestMs,
                    timeRange.latestMs,
                    timefilter,
                    severityValue,
                    maxSeriesToPlot
                  )
                ),
              });
            })
          );
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

  useEffect(() => {
    chartWidth$.next(chartWidth);
  }, [chartWidth]);

  useEffect(() => {
    severity$.next(severity);
  }, [severity]);

  return { chartsData, isLoading, error };
}
