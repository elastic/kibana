/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RefreshInterval, TimeRange } from '../../../../../src/plugins/data/common/query';
import { JobId } from './anomaly_detection_jobs/job';
import { ML_PAGES } from '../constants/ml_url_generator';
import { DataFrameAnalysisConfigType } from './data_frame_analytics';

type OptionalPageState = object | undefined;

export type MLPageState<PageType, PageState> = PageState extends OptionalPageState
  ? { page: PageType; pageState?: PageState; excludeBasePath?: boolean }
  : PageState extends object
  ? { page: PageType; pageState: PageState; excludeBasePath?: boolean }
  : { page: PageType; excludeBasePath?: boolean };

export interface MlCommonGlobalState {
  time?: TimeRange;
  refreshInterval?: RefreshInterval;
}
export interface MlCommonAppState {
  [key: string]: any;
}

export interface MlIndexBasedSearchState {
  index?: string;
  savedSearchId?: string;
}

export interface MlGenericUrlPageState extends MlIndexBasedSearchState {
  globalState?: MlCommonGlobalState;
  appState?: MlCommonAppState;
  [key: string]: any;
}

export type MlGenericUrlState = MLPageState<
  | typeof ML_PAGES.DATA_VISUALIZER_INDEX_VIEWER
  | typeof ML_PAGES.ANOMALY_DETECTION_CREATE_JOB
  | typeof ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_TYPE
  | typeof ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_INDEX
  | typeof ML_PAGES.OVERVIEW
  | typeof ML_PAGES.CALENDARS_MANAGE
  | typeof ML_PAGES.CALENDARS_NEW
  | typeof ML_PAGES.FILTER_LISTS_MANAGE
  | typeof ML_PAGES.FILTER_LISTS_NEW
  | typeof ML_PAGES.SETTINGS
  | typeof ML_PAGES.ACCESS_DENIED
  | typeof ML_PAGES.DATA_VISUALIZER
  | typeof ML_PAGES.DATA_VISUALIZER_FILE
  | typeof ML_PAGES.DATA_VISUALIZER_INDEX_SELECT,
  MlGenericUrlPageState | undefined
>;

export interface AnomalyDetectionQueryState {
  jobId?: JobId | string[];
  groupIds?: string[];
  globalState?: MlCommonGlobalState;
}

export type AnomalyDetectionUrlState = MLPageState<
  typeof ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
  AnomalyDetectionQueryState | undefined
>;
export interface ExplorerAppState {
  mlExplorerSwimlane: {
    selectedType?: string;
    selectedLanes?: string[];
    selectedTimes?: number[];
    showTopFieldValues?: boolean;
    viewByFieldName?: string;
    viewByPerPage?: number;
    viewByFromPage?: number;
  };
  mlExplorerFilter: {
    influencersFilterQuery?: unknown;
    filterActive?: boolean;
    filteredFields?: string[];
    queryString?: string;
  };
  query?: any;
  mlShowCharts?: boolean;
  mlSelectInterval?: {
    display: string;
    val: string;
  };
  mlSelectSeverity?: {
    val: number;
    display: string;
    color: string;
  };
}
export interface ExplorerGlobalState {
  ml: { jobIds: JobId[] };
  time?: TimeRange;
  refreshInterval?: RefreshInterval;
}

export interface ExplorerUrlPageState {
  /**
   * Job IDs
   */
  jobIds?: JobId[];
  /**
   * Optionally set the time range in the time picker.
   */
  timeRange?: TimeRange;
  /**
   * Optionally set the refresh interval.
   */
  refreshInterval?: RefreshInterval;
  /**
   * Optionally set the query.
   */
  query?: any;
  /**
   * Optional state for the swim lane
   */
  mlExplorerSwimlane?: ExplorerAppState['mlExplorerSwimlane'];
  mlExplorerFilter?: ExplorerAppState['mlExplorerFilter'];
  globalState?: MlCommonGlobalState;
}

export type ExplorerUrlState = MLPageState<typeof ML_PAGES.ANOMALY_EXPLORER, ExplorerUrlPageState>;

export interface TimeSeriesExplorerGlobalState {
  ml: {
    jobIds: JobId[];
  };
  time?: TimeRange;
  refreshInterval?: RefreshInterval;
}

export interface TimeSeriesExplorerAppState {
  mlTimeSeriesExplorer?: {
    forecastId?: string;
    detectorIndex?: number;
    entities?: Record<string, string>;
    zoom?: {
      from?: string;
      to?: string;
    };
  };
  query?: any;
}

export interface TimeSeriesExplorerPageState
  extends Pick<TimeSeriesExplorerAppState, 'query'>,
    Pick<TimeSeriesExplorerGlobalState, 'refreshInterval'> {
  jobIds?: JobId[];
  timeRange?: TimeRange;
  detectorIndex?: number;
  entities?: Record<string, string>;
  forecastId?: string;
  globalState?: MlCommonGlobalState;
}

export type TimeSeriesExplorerUrlState = MLPageState<
  typeof ML_PAGES.SINGLE_METRIC_VIEWER,
  TimeSeriesExplorerPageState
>;

export interface DataFrameAnalyticsQueryState {
  jobId?: JobId | JobId[];
  groupIds?: string[];
  globalState?: MlCommonGlobalState;
}

export type DataFrameAnalyticsUrlState = MLPageState<
  typeof ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE | typeof ML_PAGES.DATA_FRAME_ANALYTICS_MAP,
  DataFrameAnalyticsQueryState | undefined
>;

export interface DataFrameAnalyticsExplorationQueryState {
  ml: {
    jobId: JobId;
    analysisType: DataFrameAnalysisConfigType;
    defaultIsTraining?: boolean;
  };
}

export type DataFrameAnalyticsExplorationUrlState = MLPageState<
  typeof ML_PAGES.DATA_FRAME_ANALYTICS_EXPLORATION,
  {
    jobId: JobId;
    analysisType: DataFrameAnalysisConfigType;
    globalState?: MlCommonGlobalState;
    defaultIsTraining?: boolean;
  }
>;

export type CalendarEditUrlState = MLPageState<
  typeof ML_PAGES.CALENDARS_EDIT,
  {
    calendarId: string;
    globalState?: MlCommonGlobalState;
  }
>;

export type FilterEditUrlState = MLPageState<
  typeof ML_PAGES.FILTER_LISTS_EDIT,
  {
    filterId: string;
    globalState?: MlCommonGlobalState;
  }
>;

/**
 * Union type of ML URL state based on page
 */
export type MlUrlGeneratorState =
  | AnomalyDetectionUrlState
  | ExplorerUrlState
  | TimeSeriesExplorerUrlState
  | DataFrameAnalyticsUrlState
  | DataFrameAnalyticsExplorationUrlState
  | CalendarEditUrlState
  | FilterEditUrlState
  | MlGenericUrlState;
