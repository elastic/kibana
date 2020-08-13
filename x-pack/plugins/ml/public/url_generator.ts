/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'kibana/public';
import isEmpty from 'lodash/isEmpty';
import {
  SharePluginSetup,
  UrlGeneratorsDefinition,
  UrlGeneratorState,
} from '../../../../src/plugins/share/public';
import { TimeRange, RefreshInterval } from '../../../../src/plugins/data/public';
import { setStateToKbnUrl } from '../../../../src/plugins/kibana_utils/public';
import { JobId } from '../../reporting/common/types';
import { ExplorerAppState } from './application/explorer/explorer_dashboard_service';
import { MlStartDependencies } from './plugin';
import { ANALYSIS_CONFIG_TYPE } from './application/data_frame_analytics/common';

declare module '../../../../src/plugins/share/public' {
  export interface UrlGeneratorStateMapping {
    [ML_APP_URL_GENERATOR]: UrlGeneratorState<MlUrlGeneratorState>;
  }
}

export const ML_APP_URL_GENERATOR = 'ML_APP_URL_GENERATOR';

export const ML_TABS = {
  ANOMALY_DETECTION: 'jobs',
  ANOMALY_EXPLORER: 'explorer',
  TIME_SERIES_EXPLORER: 'timeseriesexplorer',
  DATA_FRAME_ANALYTICS: 'data_frame_analytics',
  DATA_FRAME_ANALYTICS_EXPLORATION: 'data_frame_analytics/exploration',
  DATA_VISUALIZER: 'datavisualizer',
  SETTINGS: 'settings',
  CALENDARS: 'settings/calendars_list',
  FILTERS: 'settings/filter_lists',
} as const;

export interface AnomalyDetectionQueryState {
  jobId?: JobId;
  groupIds?: string[];
}

export interface AnomalyDetectionUrlState {
  page: typeof ML_TABS.ANOMALY_DETECTION;
  jobId?: JobId;
  groupIds?: string[];
}
export interface ExplorerGlobalState {
  ml: { jobIds: JobId[] };
  time?: TimeRange;
  refreshInterval?: RefreshInterval;
}

export interface ExplorerUrlState {
  /**
   * ML App Page
   */
  page: typeof ML_TABS.ANOMALY_EXPLORER;
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

export interface TimeSeriesExplorerUrlState
  extends Pick<TimeSeriesExplorerAppState, 'zoom' | 'query'>,
    Pick<TimeSeriesExplorerGlobalState, 'refreshInterval'> {
  /**
   * ML App Page
   */
  page: typeof ML_TABS.TIME_SERIES_EXPLORER;
  jobIds: JobId[];
  timeRange?: TimeRange;
  detectorIndex?: number;
  entities?: Record<string, string>;
}

export interface DataFrameAnalyticsQueryState {
  jobId?: JobId | JobId[];
  groupIds?: string[];
}

export interface DataFrameAnalyticsUrlState extends DataFrameAnalyticsQueryState {
  page: typeof ML_TABS.DATA_FRAME_ANALYTICS;
}

export interface DataVisualizerUrlState {
  page: typeof ML_TABS.DATA_VISUALIZER;
}

export interface DataFrameAnalyticsExplorationQueryState {
  ml: {
    jobId: JobId;
    analysisType: ANALYSIS_CONFIG_TYPE;
  };
}

export interface DataFrameAnalyticsExplorationUrlState {
  page: typeof ML_TABS.DATA_FRAME_ANALYTICS_EXPLORATION;
  jobId: JobId;
  analysisType: ANALYSIS_CONFIG_TYPE;
}

/**
 * Union type of ML URL state based on page
 */
export type MlUrlGeneratorState =
  | AnomalyDetectionUrlState
  | ExplorerUrlState
  | TimeSeriesExplorerUrlState
  | DataFrameAnalyticsUrlState
  | DataFrameAnalyticsExplorationUrlState
  | DataVisualizerUrlState;

interface Params {
  appBasePath: string;
  useHash: boolean;
}

export class MlUrlGenerator implements UrlGeneratorsDefinition<typeof ML_APP_URL_GENERATOR> {
  constructor(private readonly params: Params) {}

  public readonly id = ML_APP_URL_GENERATOR;

  public readonly createUrl = async ({ page, ...params }: MlUrlGeneratorState): Promise<string> => {
    if (page === ML_TABS.ANOMALY_DETECTION) {
      return this.createAnomalyDetectionJobManagementUrl(
        params as Omit<AnomalyDetectionUrlState, 'page'>
      );
    }
    if (page === ML_TABS.ANOMALY_EXPLORER) {
      return this.createExplorerUrl(params as Omit<ExplorerUrlState, 'page'>);
    }
    if (page === ML_TABS.TIME_SERIES_EXPLORER) {
      return this.createSingleMetricViewerUrl(params as Omit<TimeSeriesExplorerUrlState, 'page'>);
    }
    if (page === ML_TABS.DATA_FRAME_ANALYTICS) {
      return this.createDataframeAnalyticsUrl(params as Omit<DataFrameAnalyticsUrlState, 'page'>);
    }
    if (page === ML_TABS.DATA_FRAME_ANALYTICS_EXPLORATION) {
      return this.createDataframeAnalyticsExplorationUrl(
        params as Omit<DataFrameAnalyticsExplorationUrlState, 'page'>
      );
    }
    if (page === ML_TABS.DATA_VISUALIZER) {
      return this.createDataVisualizerUrl(params as Omit<DataVisualizerUrlState, 'page'>);
    }

    throw new Error('Page type is not provided or unknown');
  };

  /**
   * Creates URL to the Anomaly Detection Job management page
   */
  private createAnomalyDetectionJobManagementUrl(
    params: Omit<AnomalyDetectionUrlState, 'page'>
  ): string {
    let url = `${this.params.appBasePath}/${ML_TABS.ANOMALY_DETECTION}`;
    if (isEmpty(params)) {
      return url;
    }
    const { jobId, groupIds } = params;
    const queryState: AnomalyDetectionQueryState = {
      jobId,
      groupIds,
    };

    url = setStateToKbnUrl<AnomalyDetectionQueryState>(
      'mlManagement',
      queryState,
      { useHash: false, storeInHashQuery: false },
      url
    );
    return url;
  }

  /**
   * Creates URL to the Anomaly Explorer page
   */
  private createExplorerUrl({
    refreshInterval,
    timeRange,
    jobIds,
    query,
    mlExplorerSwimlane = {},
    mlExplorerFilter = {},
  }: Omit<ExplorerUrlState, 'page'>): string {
    let url = `${this.params.appBasePath}/${ML_TABS.ANOMALY_EXPLORER}`;

    const appState: Partial<ExplorerAppState> = {
      mlExplorerSwimlane,
      mlExplorerFilter,
    };
    if (query) appState.query = query;

    if (jobIds) {
      const queryState: Partial<ExplorerGlobalState> = {
        ml: {
          jobIds,
        },
      };

      if (timeRange) queryState.time = timeRange;
      if (refreshInterval) queryState.refreshInterval = refreshInterval;

      url = setStateToKbnUrl<Partial<ExplorerGlobalState>>(
        '_g',
        queryState,
        { useHash: false, storeInHashQuery: false },
        url
      );
      url = setStateToKbnUrl<Partial<ExplorerAppState>>(
        '_a',
        appState,
        { useHash: false, storeInHashQuery: false },
        url
      );
    }

    return url;
  }

  /**
   * Creates URL to the SingleMetricViewer page
   */
  private createSingleMetricViewerUrl({
    timeRange,
    jobIds,
    refreshInterval,
    zoom,
    query,
    detectorIndex,
    entities,
  }: Omit<TimeSeriesExplorerUrlState, 'page'>): string {
    let url = `${this.params.appBasePath}/${ML_TABS.TIME_SERIES_EXPLORER}`;
    const queryState: TimeSeriesExplorerGlobalState = {
      ml: {
        jobIds,
      },
      refreshInterval,
      time: timeRange,
    };

    const appState: Partial<TimeSeriesExplorerAppState> = {};
    const mlTimeSeriesExplorer: Partial<TimeSeriesExplorerAppState['mlTimeSeriesExplorer']> = {};

    if (detectorIndex !== undefined) {
      mlTimeSeriesExplorer.detectorIndex = detectorIndex;
    }
    if (entities !== undefined) {
      mlTimeSeriesExplorer.entities = entities;
    }
    appState.mlTimeSeriesExplorer = mlTimeSeriesExplorer;

    if (zoom) appState.zoom = zoom;
    if (query)
      appState.query = {
        query_string: query,
      };
    url = setStateToKbnUrl<TimeSeriesExplorerGlobalState>(
      '_g',
      queryState,
      { useHash: false, storeInHashQuery: false },
      url
    );
    url = setStateToKbnUrl<TimeSeriesExplorerAppState>(
      '_a',
      appState,
      { useHash: false, storeInHashQuery: false },
      url
    );

    return url;
  }

  /**
   * Creates URL to the DataFrameAnalytics Exploration page
   */
  private createDataframeAnalyticsExplorationUrl(
    params: Omit<DataFrameAnalyticsExplorationUrlState, 'page'>
  ): string {
    let url = `${this.params.appBasePath}/${ML_TABS.DATA_FRAME_ANALYTICS_EXPLORATION}`;

    if (!isEmpty(params)) {
      const { jobId, analysisType } = params;
      const queryState: DataFrameAnalyticsExplorationQueryState = {
        ml: {
          jobId,
          analysisType,
        },
      };

      url = setStateToKbnUrl<DataFrameAnalyticsExplorationQueryState>(
        '_g',
        queryState,
        { useHash: false, storeInHashQuery: false },
        url
      );
    }

    return url;
  }

  /**
   * Creates URL to the DataFrameAnalytics page
   */
  private createDataframeAnalyticsUrl(params: Omit<DataFrameAnalyticsUrlState, 'page'>): string {
    let url = `${this.params.appBasePath}/${ML_TABS.DATA_FRAME_ANALYTICS}`;

    if (!isEmpty(params)) {
      const { jobId, groupIds } = params;
      const queryState: Partial<DataFrameAnalyticsQueryState> = {
        jobId,
        groupIds,
      };

      url = setStateToKbnUrl<Partial<DataFrameAnalyticsQueryState>>(
        'mlManagement',
        queryState,
        { useHash: false, storeInHashQuery: false },
        url
      );
    }

    return url;
  }

  /**
   * Creates URL to the Data Visualizer page
   */
  private createDataVisualizerUrl({}: Omit<DataVisualizerUrlState, 'page'>): string {
    return `${this.params.appBasePath}/${ML_TABS.DATA_VISUALIZER}`;
  }
}

/**
 * Registers the URL generator
 */
export function registerUrlGenerator(
  share: SharePluginSetup,
  core: CoreSetup<MlStartDependencies>
) {
  const baseUrl = core.http.basePath.prepend('/app/ml');
  share.urlGenerators.registerUrlGenerator(
    new MlUrlGenerator({
      appBasePath: baseUrl,
      useHash: core.uiSettings.get('state:storeInSessionStorage'),
    })
  );
}
