/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import memoizeOne from 'memoize-one';
import { isEqual } from 'lodash';
import useObservable from 'react-use/lib/useObservable';

import { forkJoin, of, Observable, Subject } from 'rxjs';
import { mergeMap, switchMap, tap } from 'rxjs/operators';

import { useCallback, useMemo } from 'react';
import { anomalyDataChange } from '../explorer_charts/explorer_charts_container_service';
import { explorerService } from '../explorer_dashboard_service';
import {
  getDateFormatTz,
  getSelectionInfluencers,
  getSelectionJobIds,
  getSelectionTimeRange,
  loadAnnotationsTableData,
  loadAnomaliesTableData,
  loadDataForCharts,
  loadFilteredTopInfluencers,
  loadTopInfluencers,
  AppStateSelectedCells,
  ExplorerJob,
  TimeRangeBounds,
} from '../explorer_utils';
import { ExplorerState } from '../reducers';
import { useMlKibana, useTimefilter } from '../../contexts/kibana';
import { AnomalyTimelineService } from '../../services/anomaly_timeline_service';
import { mlResultsServiceProvider } from '../../services/results_service';
import { isViewBySwimLaneData } from '../swimlane_container';
import { ANOMALY_SWIM_LANE_HARD_LIMIT } from '../explorer_constants';

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
  return memoizeOne(wrapWithLastRefreshArg<T>(func, context), memoizeIsEqual);
};

const memoizedAnomalyDataChange = memoize<typeof anomalyDataChange>(anomalyDataChange);
const memoizedLoadAnnotationsTableData = memoize<typeof loadAnnotationsTableData>(
  loadAnnotationsTableData
);
const memoizedLoadDataForCharts = memoize<typeof loadDataForCharts>(loadDataForCharts);
const memoizedLoadFilteredTopInfluencers = memoize<typeof loadFilteredTopInfluencers>(
  loadFilteredTopInfluencers
);
const memoizedLoadTopInfluencers = memoize(loadTopInfluencers);
const memoizedLoadAnomaliesTableData = memoize(loadAnomaliesTableData);

export interface LoadExplorerDataConfig {
  bounds: TimeRangeBounds;
  influencersFilterQuery: any;
  lastRefresh: number;
  noInfluencersConfigured: boolean;
  selectedCells: AppStateSelectedCells | undefined;
  selectedJobs: ExplorerJob[];
  swimlaneBucketInterval: any;
  swimlaneLimit: number;
  tableInterval: string;
  tableSeverity: number;
  viewBySwimlaneFieldName: string;
  viewByFromPage: number;
  viewByPerPage: number;
  swimlaneContainerWidth: number;
}

export const isLoadExplorerDataConfig = (arg: any): arg is LoadExplorerDataConfig => {
  return (
    arg !== undefined &&
    arg.bounds !== undefined &&
    arg.selectedJobs !== undefined &&
    arg.selectedJobs !== null &&
    arg.viewBySwimlaneFieldName !== undefined
  );
};

/**
 * Fetches the data necessary for the Anomaly Explorer using observables.
 */
const loadExplorerDataProvider = (anomalyTimelineService: AnomalyTimelineService) => {
  const memoizedLoadOverallData = memoize(
    anomalyTimelineService.loadOverallData,
    anomalyTimelineService
  );
  const memoizedLoadViewBySwimlane = memoize(
    anomalyTimelineService.loadViewBySwimlane,
    anomalyTimelineService
  );
  return (config: LoadExplorerDataConfig): Observable<Partial<ExplorerState>> => {
    if (!isLoadExplorerDataConfig(config)) {
      return of({});
    }

    const {
      bounds,
      lastRefresh,
      influencersFilterQuery,
      noInfluencersConfigured,
      selectedCells,
      selectedJobs,
      swimlaneBucketInterval,
      swimlaneLimit,
      tableInterval,
      tableSeverity,
      viewBySwimlaneFieldName,
      swimlaneContainerWidth,
      viewByFromPage,
      viewByPerPage,
    } = config;

    const selectionInfluencers = getSelectionInfluencers(selectedCells, viewBySwimlaneFieldName);
    const jobIds = getSelectionJobIds(selectedCells, selectedJobs);
    const timerange = getSelectionTimeRange(
      selectedCells,
      swimlaneBucketInterval.asSeconds(),
      bounds
    );

    const dateFormatTz = getDateFormatTz();

    // First get the data where we have all necessary args at hand using forkJoin:
    // annotationsData, anomalyChartRecords, influencers, overallState, tableData, topFieldValues
    return forkJoin({
      annotationsData: memoizedLoadAnnotationsTableData(
        lastRefresh,
        selectedCells,
        selectedJobs,
        swimlaneBucketInterval.asSeconds(),
        bounds
      ),
      anomalyChartRecords: memoizedLoadDataForCharts(
        lastRefresh,
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
              jobIds,
              timerange.earliestMs,
              timerange.latestMs,
              [],
              noInfluencersConfigured,
              influencersFilterQuery
            )
          : Promise.resolve({}),
      overallState: memoizedLoadOverallData(lastRefresh, selectedJobs, swimlaneContainerWidth),
      tableData: memoizedLoadAnomaliesTableData(
        lastRefresh,
        selectedCells,
        selectedJobs,
        dateFormatTz,
        swimlaneBucketInterval.asSeconds(),
        bounds,
        viewBySwimlaneFieldName,
        tableInterval,
        tableSeverity,
        influencersFilterQuery
      ),
      topFieldValues:
        selectedCells !== undefined && selectedCells.showTopFieldValues === true
          ? anomalyTimelineService.loadViewByTopFieldValuesForSelectedTime(
              timerange.earliestMs,
              timerange.latestMs,
              selectedJobs,
              viewBySwimlaneFieldName,
              swimlaneLimit,
              viewByPerPage,
              viewByFromPage,
              swimlaneContainerWidth
            )
          : Promise.resolve([]),
    }).pipe(
      // Trigger a side-effect action to reset view-by swimlane,
      // show the view-by loading indicator
      // and pass on the data we already fetched.
      tap(explorerService.setViewBySwimlaneLoading),
      // Trigger a side-effect to update the charts.
      tap(({ anomalyChartRecords }) => {
        if (selectedCells !== undefined && Array.isArray(anomalyChartRecords)) {
          memoizedAnomalyDataChange(
            lastRefresh,
            anomalyChartRecords,
            timerange.earliestMs,
            timerange.latestMs,
            tableSeverity
          );
        } else {
          memoizedAnomalyDataChange(
            lastRefresh,
            [],
            timerange.earliestMs,
            timerange.latestMs,
            tableSeverity
          );
        }
      }),
      // Load view-by swimlane data and filtered top influencers.
      // mergeMap is used to have access to the already fetched data and act on it in arg #1.
      // In arg #2 of mergeMap we combine the data and pass it on in the action format
      // which can be consumed by explorerReducer() later on.
      mergeMap(
        ({ anomalyChartRecords, influencers, overallState, topFieldValues }) =>
          forkJoin({
            influencers:
              (selectionInfluencers.length > 0 || influencersFilterQuery !== undefined) &&
              anomalyChartRecords !== undefined &&
              anomalyChartRecords.length > 0
                ? memoizedLoadFilteredTopInfluencers(
                    lastRefresh,
                    jobIds,
                    timerange.earliestMs,
                    timerange.latestMs,
                    anomalyChartRecords,
                    selectionInfluencers,
                    noInfluencersConfigured,
                    influencersFilterQuery
                  )
                : Promise.resolve(influencers),
            viewBySwimlaneState: memoizedLoadViewBySwimlane(
              lastRefresh,
              topFieldValues,
              {
                earliest: overallState.earliest,
                latest: overallState.latest,
              },
              selectedJobs,
              viewBySwimlaneFieldName,
              ANOMALY_SWIM_LANE_HARD_LIMIT,
              viewByPerPage,
              viewByFromPage,
              swimlaneContainerWidth,
              influencersFilterQuery
            ),
          }),
        (
          { annotationsData, overallState, tableData },
          { influencers, viewBySwimlaneState }
        ): Partial<ExplorerState> => {
          return {
            annotations: annotationsData,
            influencers,
            loading: false,
            viewBySwimlaneDataLoading: false,
            overallSwimlaneData: overallState,
            viewBySwimlaneData: viewBySwimlaneState,
            tableData,
            swimlaneLimit: isViewBySwimLaneData(viewBySwimlaneState)
              ? viewBySwimlaneState.cardinality
              : undefined,
          };
        }
      )
    );
  };
};
export const useExplorerData = (): [Partial<ExplorerState> | undefined, (d: any) => void] => {
  const timefilter = useTimefilter();

  const {
    services: {
      mlServices: { mlApiServices },
      uiSettings,
    },
  } = useMlKibana();
  const loadExplorerData = useMemo(() => {
    const service = new AnomalyTimelineService(
      timefilter,
      uiSettings,
      mlResultsServiceProvider(mlApiServices)
    );
    return loadExplorerDataProvider(service);
  }, []);
  const loadExplorerData$ = useMemo(() => new Subject<LoadExplorerDataConfig>(), []);
  const explorerData$ = useMemo(() => loadExplorerData$.pipe(switchMap(loadExplorerData)), []);
  const explorerData = useObservable(explorerData$);

  const update = useCallback((c) => {
    loadExplorerData$.next(c);
  }, []);

  return [explorerData, update];
};
