/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RefreshInterval, TimeRange } from '../../../../../src/plugins/data/common/query';
import { JobId } from '../../../reporting/common/types';
import { ML_PAGES } from '../constants/ml_url_generator';

type OptionalPageState = object | undefined;

export type MLPageState<PageType, PageState> = PageState extends OptionalPageState
  ? { page: PageType; pageState?: PageState }
  : PageState extends object
  ? { page: PageType; pageState: PageState }
  : { page: PageType };

export const ANALYSIS_CONFIG_TYPE = {
  OUTLIER_DETECTION: 'outlier_detection',
  REGRESSION: 'regression',
  CLASSIFICATION: 'classification',
} as const;

type DataFrameAnalyticsType = typeof ANALYSIS_CONFIG_TYPE[keyof typeof ANALYSIS_CONFIG_TYPE];

export interface MlCommonGlobalState {
  time?: TimeRange;
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

export interface MlGenericUrlState {
  page:
    | typeof ML_PAGES.DATA_VISUALIZER_INDEX_VIEWER
    | typeof ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_TYPE;
  pageState: MlGenericUrlPageState;
}

export interface AnomalyDetectionQueryState {
  jobId?: JobId;
  groupIds?: string[];
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
  jobIds: JobId[];
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
  zoom?: {
    from?: string;
    to?: string;
  };
  mlTimeSeriesExplorer?: {
    detectorIndex?: number;
    entities?: Record<string, string>;
  };
  query?: any;
}

export interface TimeSeriesExplorerPageState
  extends Pick<TimeSeriesExplorerAppState, 'zoom' | 'query'>,
    Pick<TimeSeriesExplorerGlobalState, 'refreshInterval'> {
  jobIds: JobId[];
  timeRange?: TimeRange;
  detectorIndex?: number;
  entities?: Record<string, string>;
}

export type TimeSeriesExplorerUrlState = MLPageState<
  typeof ML_PAGES.SINGLE_METRIC_VIEWER,
  TimeSeriesExplorerPageState
>;

export interface DataFrameAnalyticsQueryState {
  jobId?: JobId | JobId[];
  groupIds?: string[];
}

export type DataFrameAnalyticsUrlState = MLPageState<
  typeof ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE,
  DataFrameAnalyticsQueryState | undefined
>;

export interface DataVisualizerUrlState {
  page:
    | typeof ML_PAGES.DATA_VISUALIZER
    | typeof ML_PAGES.DATA_VISUALIZER_FILE
    | typeof ML_PAGES.DATA_VISUALIZER_INDEX_SELECT;
}

export interface DataFrameAnalyticsExplorationQueryState {
  ml: {
    jobId: JobId;
    analysisType: DataFrameAnalyticsType;
  };
}

export type DataFrameAnalyticsExplorationUrlState = MLPageState<
  typeof ML_PAGES.DATA_FRAME_ANALYTICS_EXPLORATION,
  {
    jobId: JobId;
    analysisType: DataFrameAnalyticsType;
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
  | DataVisualizerUrlState
  | MlGenericUrlState;
