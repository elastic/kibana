/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorPublic } from 'src/plugins/share/public';
import type { RefreshInterval, TimeRange } from '../../../../../src/plugins/data/common/query';
import type { JobId } from './anomaly_detection_jobs/job';
import type { DataFrameAnalysisConfigType } from './data_frame_analytics';
import type { SearchQueryLanguage } from '../constants/search';
import type { ListingPageUrlState } from './common';
import type { InfluencersFilterQuery } from './es_client';
import { ML_PAGES } from '../constants/locator';

type OptionalPageState = object | undefined;

export type MLPageState<PageType, PageState> = PageState extends OptionalPageState
  ? { page: PageType; pageState?: PageState }
  : PageState extends object
  ? { page: PageType; pageState: PageState }
  : { page: PageType };

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
  | typeof ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_ADVANCED
  | typeof ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_TYPE
  | typeof ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_INDEX
  | typeof ML_PAGES.DATA_FRAME_ANALYTICS_CREATE_JOB
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

export type AnomalyExplorerSwimLaneUrlState = ExplorerAppState['mlExplorerSwimlane'];

export type AnomalyExplorerFilterUrlState = ExplorerAppState['mlExplorerFilter'];

export interface ExplorerAppState {
  mlExplorerSwimlane: {
    selectedType?: 'overall' | 'viewBy';
    selectedLanes?: string[];
    /**
     * @deprecated legacy query param variable, use `selectedLanes`
     */
    selectedLane?: string[] | string;
    /**
     * It's possible to have only "from" time boundaries, e.g. in the Watcher URL
     */
    selectedTimes?: [number, number] | number;
    /**
     * @deprecated legacy query param variable, use `selectedTimes`
     */
    selectedTime?: [number, number] | number;
    showTopFieldValues?: boolean;
    viewByFieldName?: string;
    viewByPerPage?: number;
    viewByFromPage?: number;
    /**
     * Indicated severity threshold for both swim lanes
     */
    severity?: number;
  };
  mlExplorerFilter: {
    influencersFilterQuery?: InfluencersFilterQuery;
    filterActive?: boolean;
    filteredFields?: Array<string | number>;
    queryString?: string;
  };
  query?: any;
  mlShowCharts?: boolean;
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

export interface TimeSeriesExplorerParams {
  forecastId?: string;
  detectorIndex?: number;
  entities?: Record<string, string>;
  zoom?: {
    from?: string;
    to?: string;
  };
  functionDescription?: string;
}
export interface TimeSeriesExplorerAppState {
  mlTimeSeriesExplorer?: TimeSeriesExplorerParams;
  query?: any;
}

export interface TimeSeriesExplorerPageState
  extends TimeSeriesExplorerParams,
    Pick<TimeSeriesExplorerAppState, 'query'>,
    Pick<TimeSeriesExplorerGlobalState, 'refreshInterval'> {
  jobIds?: JobId[];
  timeRange?: TimeRange;
  globalState?: MlCommonGlobalState;
}

export type TimeSeriesExplorerUrlState = MLPageState<
  typeof ML_PAGES.SINGLE_METRIC_VIEWER,
  TimeSeriesExplorerPageState
>;

export interface DataFrameAnalyticsQueryState {
  analysisType?: DataFrameAnalysisConfigType;
  jobId?: JobId | JobId[];
  modelId?: string;
  groupIds?: string[];
  globalState?: MlCommonGlobalState;
}

export interface TrainedModelsQueryState {
  modelId?: string;
}

export interface TrainedModelsNodesQueryState {
  nodeId?: string;
}

export type DataFrameAnalyticsUrlState = MLPageState<
  | typeof ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE
  | typeof ML_PAGES.DATA_FRAME_ANALYTICS_MAP
  | typeof ML_PAGES.DATA_FRAME_ANALYTICS_CREATE_JOB,
  DataFrameAnalyticsQueryState | undefined
>;

export interface DataFrameAnalyticsExplorationQueryState {
  ml: {
    jobId: JobId;
    analysisType: DataFrameAnalysisConfigType;
    defaultIsTraining?: boolean;
    modelId?: string;
  };
}

export type DataFrameAnalyticsExplorationUrlState = MLPageState<
  typeof ML_PAGES.DATA_FRAME_ANALYTICS_EXPLORATION,
  {
    jobId: JobId;
    analysisType: DataFrameAnalysisConfigType;
    globalState?: MlCommonGlobalState;
    queryText?: string;
    modelId?: string;
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

export type ExpandablePanels =
  | 'analysis'
  | 'evaluation'
  | 'feature_importance'
  | 'results'
  | 'splom';

export type ExplorationPageUrlState = {
  queryText: string;
  queryLanguage: SearchQueryLanguage;
} & Pick<ListingPageUrlState, 'pageIndex' | 'pageSize'> & { [key in ExpandablePanels]: boolean };

/**
 * Union type of ML URL state based on page
 */
export type MlLocatorState =
  | AnomalyDetectionUrlState
  | ExplorerUrlState
  | TimeSeriesExplorerUrlState
  | DataFrameAnalyticsUrlState
  | DataFrameAnalyticsExplorationUrlState
  | CalendarEditUrlState
  | FilterEditUrlState
  | MlGenericUrlState
  | TrainedModelsUrlState
  | TrainedModelsNodesUrlState;

export type MlLocatorParams = MlLocatorState & SerializableRecord;

export type MlLocator = LocatorPublic<MlLocatorParams>;

export type TrainedModelsUrlState = MLPageState<
  typeof ML_PAGES.TRAINED_MODELS_MANAGE,
  TrainedModelsQueryState | undefined
>;

export type TrainedModelsNodesUrlState = MLPageState<
  typeof ML_PAGES.TRAINED_MODELS_NODES,
  TrainedModelsNodesQueryState | undefined
>;
