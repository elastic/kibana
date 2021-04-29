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
import { mergeMap, switchMap, tap, map } from 'rxjs/operators';

import { useCallback, useMemo } from 'react';
import { explorerService } from '../explorer_dashboard_service';
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
import { AnomalyTimelineService } from '../../services/anomaly_timeline_service';
import { MlResultsService, mlResultsServiceProvider } from '../../services/results_service';
import { isViewBySwimLaneData } from '../swimlane_container';
import { ANOMALY_SWIM_LANE_HARD_LIMIT } from '../explorer_constants';
import { TimefilterContract } from '../../../../../../../src/plugins/data/public';
import { AnomalyExplorerChartsService } from '../../services/anomaly_explorer_charts_service';
import { CombinedJob } from '../../../../common/types/anomaly_detection_jobs';
import { InfluencersFilterQuery } from '../../../../common/types/es_client';
import { mlJobService } from '../../services/job_service';
import { TimeBucketsInterval } from '../../util/time_buckets';

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
  return memoizeOne(wrapWithLastRefreshArg<T>(func, context) as any, memoizeIsEqual);
};

const memoizedLoadOverallAnnotations = memoize<typeof loadOverallAnnotations>(
  loadOverallAnnotations
);

const memoizedLoadAnnotationsTableData = memoize<typeof loadAnnotationsTableData>(
  loadAnnotationsTableData
);
const memoizedLoadFilteredTopInfluencers = memoize<typeof loadFilteredTopInfluencers>(
  loadFilteredTopInfluencers
);
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
  viewByFromPage: number;
  viewByPerPage: number;
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
  anomalyTimelineService: AnomalyTimelineService,
  anomalyExplorerChartsService: AnomalyExplorerChartsService,
  timefilter: TimefilterContract
) => {
  const memoizedLoadOverallData = memoize(
    anomalyTimelineService.loadOverallData,
    anomalyTimelineService
  );
  const memoizedLoadViewBySwimlane = memoize(
    anomalyTimelineService.loadViewBySwimlane,
    anomalyTimelineService
  );
  const memoizedAnomalyDataChange = memoize(
    anomalyExplorerChartsService.getAnomalyData,
    anomalyExplorerChartsService
  );

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
      swimlaneBucketInterval,
      swimlaneLimit,
      tableInterval,
      tableSeverity,
      viewBySwimlaneFieldName,
      swimlaneContainerWidth,
      viewByFromPage,
      viewByPerPage,
    } = config;

    const combinedJobRecords: Record<string, CombinedJob> = selectedJobs.reduce((acc, job) => {
      return { ...acc, [job.id]: mlJobService.getJob(job.id) };
    }, {});

    const selectionInfluencers = getSelectionInfluencers(selectedCells, viewBySwimlaneFieldName);
    const jobIds = getSelectionJobIds(selectedCells, selectedJobs);

    const bounds = timefilter.getBounds();

    const timerange = getSelectionTimeRange(
      selectedCells,
      swimlaneBucketInterval.asSeconds(),
      bounds
    );

    const dateFormatTz = getDateFormatTz();

    const interval = swimlaneBucketInterval.asSeconds();
    // First get the data where we have all necessary args at hand using forkJoin:
    // annotationsData, anomalyChartRecords, influencers, overallState, tableData, topFieldValues
    return forkJoin({
      overallAnnotations: memoizedLoadOverallAnnotations(
        lastRefresh,
        selectedJobs,
        interval,
        bounds
      ),
      annotationsData: memoizedLoadAnnotationsTableData(
        lastRefresh,
        selectedCells,
        selectedJobs,
        swimlaneBucketInterval.asSeconds(),
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
      tap(({ anomalyChartRecords, topFieldValues }) => {
        memoizedAnomalyDataChange(
          lastRefresh,
          explorerService,
          combinedJobRecords,
          swimlaneContainerWidth,
          selectedCells !== undefined && Array.isArray(anomalyChartRecords)
            ? anomalyChartRecords
            : [],
          timerange.earliestMs,
          timerange.latestMs,
          timefilter,
          tableSeverity
        );
      }),
      mergeMap(
        ({
          overallAnnotations,
          anomalyChartRecords,
          influencers,
          overallState,
          topFieldValues,
          annotationsData,
          tableData,
        }) =>
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
          }).pipe(
            map(({ viewBySwimlaneState, filteredTopInfluencers }) => {
              return {
                overallAnnotations,
                annotations: annotationsData,
                influencers: filteredTopInfluencers as any,
                loading: false,
                viewBySwimlaneDataLoading: false,
                anomalyChartsDataLoading: false,
                overallSwimlaneData: overallState,
                viewBySwimlaneData: viewBySwimlaneState as any,
                tableData,
                swimlaneLimit: isViewBySwimLaneData(viewBySwimlaneState)
                  ? viewBySwimlaneState.cardinality
                  : undefined,
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
      uiSettings,
    },
  } = useMlKibana();

  const loadExplorerData = useMemo(() => {
    const mlResultsService = mlResultsServiceProvider(mlApiServices);
    const anomalyTimelineService = new AnomalyTimelineService(
      timefilter,
      uiSettings,
      mlResultsService
    );
    const anomalyExplorerChartsService = new AnomalyExplorerChartsService(
      timefilter,
      mlApiServices,
      mlResultsService
    );
    return loadExplorerDataProvider(
      mlResultsService,
      anomalyTimelineService,
      anomalyExplorerChartsService,
      timefilter
    );
  }, []);

  const loadExplorerData$ = useMemo(() => new Subject<LoadExplorerDataConfig>(), []);
  const explorerData$ = useMemo(() => loadExplorerData$.pipe(switchMap(loadExplorerData)), []);
  const explorerData = useObservable(explorerData$);

  const update = useCallback((c) => {
    loadExplorerData$.next(c);
  }, []);

  return [explorerData, update];
};
