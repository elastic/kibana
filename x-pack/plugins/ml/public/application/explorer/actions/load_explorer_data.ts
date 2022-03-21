/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import memoizeOne from 'memoize-one';
import { isEqual } from 'lodash';
import useObservable from 'react-use/lib/useObservable';

import { forkJoin, of, Observable, Subject } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

import { useCallback, useMemo } from 'react';
import {
  getDateFormatTz,
  getSelectionInfluencers,
  getSelectionJobIds,
  getSelectionTimeRange,
  loadAnnotationsTableData,
  loadAnomaliesTableData,
  loadFilteredTopInfluencers,
  loadTopInfluencers,
  loadOverallAnnotations,
  AppStateSelectedCells,
  ExplorerJob,
} from '../explorer_utils';
import { ExplorerState } from '../reducers';
import { useMlKibana, useTimefilter } from '../../contexts/kibana';
import { MlResultsService, mlResultsServiceProvider } from '../../services/results_service';
import { TimefilterContract } from '../../../../../../../src/plugins/data/public';
import { AnomalyExplorerChartsService } from '../../services/anomaly_explorer_charts_service';
import type { InfluencersFilterQuery } from '../../../../common/types/es_client';
import type { TimeBucketsInterval, TimeRangeBounds } from '../../util/time_buckets';

// Memoize the data fetching methods.
// wrapWithLastRefreshArg() wraps any given function and preprends a `lastRefresh` argument
// which will be considered by memoizeOne. This way we can add the `lastRefresh` argument as a
// caching parameter without having to change all the original functions which shouldn't care
// about this parameter. The generic type T retains and returns the type information of
// the original function.
const memoizeIsEqual = (newArgs: any[], lastArgs: any[]) => isEqual(newArgs, lastArgs);
const wrapWithLastRefreshArg = <T extends (...a: any[]) => any>(func: T, context: any = null) => {
  return function (lastRefresh: number, ...args: Parameters<T>): ReturnType<T> {
    return func.apply(context, args);
  };
};
const memoize = <T extends (...a: any[]) => any>(func: T, context?: any) => {
  return memoizeOne(wrapWithLastRefreshArg<T>(func, context) as any, memoizeIsEqual) as (
    lastRefresh: number,
    ...args: Parameters<T>
  ) => ReturnType<T>;
};

const memoizedLoadOverallAnnotations = memoize(loadOverallAnnotations);

const memoizedLoadAnnotationsTableData = memoize(loadAnnotationsTableData);

const memoizedLoadFilteredTopInfluencers = memoize(loadFilteredTopInfluencers);

const memoizedLoadTopInfluencers = memoize(loadTopInfluencers);

const memoizedLoadAnomaliesTableData = memoize(loadAnomaliesTableData);

export interface LoadExplorerDataConfig {
  influencersFilterQuery: InfluencersFilterQuery;
  lastRefresh: number;
  noInfluencersConfigured: boolean;
  selectedCells: AppStateSelectedCells | undefined;
  selectedJobs: ExplorerJob[];
  swimlaneBucketInterval: TimeBucketsInterval;
  swimlaneLimit: number;
  tableInterval: string;
  tableSeverity: number;
  viewBySwimlaneFieldName: string;
  swimlaneContainerWidth: number;
}

export const isLoadExplorerDataConfig = (arg: any): arg is LoadExplorerDataConfig => {
  return (
    arg !== undefined &&
    arg.selectedJobs !== undefined &&
    arg.selectedJobs !== null &&
    arg.viewBySwimlaneFieldName !== undefined
  );
};

/**
 * Fetches the data necessary for the Anomaly Explorer using observables.
 */
const loadExplorerDataProvider = (
  mlResultsService: MlResultsService,
  anomalyExplorerChartsService: AnomalyExplorerChartsService,
  timefilter: TimefilterContract
) => {
  return (config: LoadExplorerDataConfig): Observable<Partial<ExplorerState>> => {
    if (!isLoadExplorerDataConfig(config)) {
      return of({});
    }

    const {
      lastRefresh,
      influencersFilterQuery,
      noInfluencersConfigured,
      selectedCells,
      selectedJobs,
      tableInterval,
      tableSeverity,
      viewBySwimlaneFieldName,
    } = config;

    const selectionInfluencers = getSelectionInfluencers(selectedCells, viewBySwimlaneFieldName);
    const jobIds = getSelectionJobIds(selectedCells, selectedJobs);

    const bounds = timefilter.getBounds() as Required<TimeRangeBounds>;

    const timerange = getSelectionTimeRange(selectedCells, bounds);

    const dateFormatTz = getDateFormatTz();

    // First get the data where we have all necessary args at hand using forkJoin:
    // annotationsData, anomalyChartRecords, influencers, overallState, tableData
    return forkJoin({
      overallAnnotations: memoizedLoadOverallAnnotations(lastRefresh, selectedJobs, bounds),
      annotationsData: memoizedLoadAnnotationsTableData(
        lastRefresh,
        selectedCells,
        selectedJobs,
        bounds
      ),
      anomalyChartRecords: anomalyExplorerChartsService.loadDataForCharts$(
        jobIds,
        timerange.earliestMs,
        timerange.latestMs,
        selectionInfluencers,
        selectedCells,
        influencersFilterQuery
      ),
      influencers:
        selectionInfluencers.length === 0
          ? memoizedLoadTopInfluencers(
              lastRefresh,
              mlResultsService,
              jobIds,
              timerange.earliestMs,
              timerange.latestMs,
              [],
              noInfluencersConfigured,
              influencersFilterQuery
            )
          : Promise.resolve({}),
      tableData: memoizedLoadAnomaliesTableData(
        lastRefresh,
        selectedCells,
        selectedJobs,
        dateFormatTz,
        bounds,
        viewBySwimlaneFieldName,
        tableInterval,
        tableSeverity,
        influencersFilterQuery
      ),
    }).pipe(
      switchMap(
        ({ overallAnnotations, anomalyChartRecords, influencers, annotationsData, tableData }) =>
          forkJoin({
            filteredTopInfluencers:
              (selectionInfluencers.length > 0 || influencersFilterQuery !== undefined) &&
              anomalyChartRecords !== undefined &&
              anomalyChartRecords.length > 0
                ? memoizedLoadFilteredTopInfluencers(
                    lastRefresh,
                    mlResultsService,
                    jobIds,
                    timerange.earliestMs,
                    timerange.latestMs,
                    anomalyChartRecords,
                    selectionInfluencers,
                    noInfluencersConfigured,
                    influencersFilterQuery
                  )
                : Promise.resolve(influencers),
          }).pipe(
            map(({ filteredTopInfluencers }) => {
              return {
                overallAnnotations,
                annotations: annotationsData,
                influencers: filteredTopInfluencers as any,
                loading: false,
                anomalyChartsDataLoading: false,
                tableData,
              };
            })
          )
      )
    );
  };
};

export const useExplorerData = (): [Partial<ExplorerState> | undefined, (d: any) => void] => {
  const timefilter = useTimefilter();

  const {
    services: {
      mlServices: { mlApiServices },
    },
  } = useMlKibana();

  const loadExplorerData = useMemo(() => {
    const mlResultsService = mlResultsServiceProvider(mlApiServices);

    const anomalyExplorerChartsService = new AnomalyExplorerChartsService(
      timefilter,
      mlApiServices,
      mlResultsService
    );
    return loadExplorerDataProvider(mlResultsService, anomalyExplorerChartsService, timefilter);
  }, []);

  const loadExplorerData$ = useMemo(() => new Subject<LoadExplorerDataConfig>(), []);
  const explorerData$ = useMemo(() => loadExplorerData$.pipe(switchMap(loadExplorerData)), []);
  const explorerData = useObservable(explorerData$);

  const update = useCallback((c) => {
    loadExplorerData$.next(c);
  }, []);

  return [explorerData, update];
};
