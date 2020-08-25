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
import { setStateToKbnUrl } from '../../../../src/plugins/kibana_utils/public';
import { MlStartDependencies } from './plugin';
import { ML_PAGES, ML_APP_URL_GENERATOR } from '../common/constants/ml_url_generator';
import {
  MlUrlGeneratorState,
  AnomalyDetectionUrlState,
  ExplorerUrlState,
  TimeSeriesExplorerUrlState,
  DataFrameAnalyticsUrlState,
  DataFrameAnalyticsExplorationUrlState,
  DataVisualizerUrlState,
  MlGenericUrlState,
  AnomalyDetectionQueryState,
  ExplorerGlobalState,
  TimeSeriesExplorerGlobalState,
  TimeSeriesExplorerAppState,
  DataFrameAnalyticsExplorationQueryState,
  DataFrameAnalyticsQueryState,
  ExplorerAppState,
} from '../common/types/ml_url_generator';

declare module '../../../../src/plugins/share/public' {
  export interface UrlGeneratorStateMapping {
    [ML_APP_URL_GENERATOR]: UrlGeneratorState<MlUrlGeneratorState>;
  }
}

interface Params {
  appBasePath: string;
  useHash: boolean;
}

export class MlUrlGenerator implements UrlGeneratorsDefinition<typeof ML_APP_URL_GENERATOR> {
  constructor(private readonly params: Params) {}

  public readonly id = ML_APP_URL_GENERATOR;

  public readonly createUrl = async (mlUrlGeneratorState: MlUrlGeneratorState): Promise<string> => {
    switch (mlUrlGeneratorState.page) {
      case ML_PAGES.ANOMALY_DETECTION:
        return this.createAnomalyDetectionJobManagementUrl(
          mlUrlGeneratorState as AnomalyDetectionUrlState
        );
      case ML_PAGES.ANOMALY_EXPLORER:
        return this.createExplorerUrl(mlUrlGeneratorState as ExplorerUrlState);
      case ML_PAGES.SINGLE_METRIC_VIEWER:
        return this.createSingleMetricViewerUrl(mlUrlGeneratorState as TimeSeriesExplorerUrlState);
      case ML_PAGES.DATA_FRAME_ANALYTICS:
        return this.createDataframeAnalyticsUrl(mlUrlGeneratorState as DataFrameAnalyticsUrlState);
      case ML_PAGES.DATA_FRAME_ANALYTICS_EXPLORATION:
        return this.createDataframeAnalyticsExplorationUrl(
          mlUrlGeneratorState as DataFrameAnalyticsExplorationUrlState
        );
      case ML_PAGES.DATA_VISUALIZER:
        return this.createDataVisualizerUrl(mlUrlGeneratorState as DataVisualizerUrlState);
      case ML_PAGES.DATA_VISUALIZER_FILE:
        return this.createDataVisualizerUrl(mlUrlGeneratorState as DataVisualizerUrlState);
      case ML_PAGES.DATA_VISUALIZER_INDEX_SELECT:
        return this.createDataVisualizerUrl(mlUrlGeneratorState as DataVisualizerUrlState);
      case ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_TYPE:
        return this.createIndexBasedMlUrl(mlUrlGeneratorState as MlGenericUrlState);
      case ML_PAGES.DATA_VISUALIZER_INDEX_VIEWER:
        return this.createIndexBasedMlUrl(mlUrlGeneratorState as MlGenericUrlState);
      default:
        throw new Error('Page type is not provided or unknown');
    }
  };

  private static extractParams<UrlState>(urlState: UrlState) {
    // page should be guaranteed to exist here but <UrlState> is unknown
    // @ts-ignore
    const { page, ...params } = urlState;
    return { page, params };
  }
  /**
   * Creates URL to the Anomaly Detection Job management page
   */
  private createAnomalyDetectionJobManagementUrl(
    mlUrlGeneratorState: AnomalyDetectionUrlState
  ): string {
    const { params } = MlUrlGenerator.extractParams<AnomalyDetectionUrlState>(mlUrlGeneratorState);
    let url = `${this.params.appBasePath}/${ML_PAGES.ANOMALY_DETECTION}`;
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
  }: ExplorerUrlState): string {
    let url = `${this.params.appBasePath}/${ML_PAGES.ANOMALY_EXPLORER}`;

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
  }: TimeSeriesExplorerUrlState): string {
    let url = `${this.params.appBasePath}/${ML_PAGES.SINGLE_METRIC_VIEWER}`;
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
    mlUrlGeneratorState: DataFrameAnalyticsExplorationUrlState
  ): string {
    let url = `${this.params.appBasePath}/${ML_PAGES.DATA_FRAME_ANALYTICS_EXPLORATION}`;
    const { params } = MlUrlGenerator.extractParams<DataFrameAnalyticsExplorationUrlState>(
      mlUrlGeneratorState
    );

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
  private createDataframeAnalyticsUrl(mlUrlGeneratorState: DataFrameAnalyticsUrlState): string {
    let url = `${this.params.appBasePath}/${ML_PAGES.DATA_FRAME_ANALYTICS}`;
    const { params } = MlUrlGenerator.extractParams<DataFrameAnalyticsUrlState>(
      mlUrlGeneratorState
    );

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
  private createDataVisualizerUrl({ page }: DataVisualizerUrlState): string {
    return `${this.params.appBasePath}/${page}`;
  }

  /**
   * Creates generic index based search ML url
   * e.g. `jobs/new_job/datavisualizer?index=3da93760-e0af-11ea-9ad3-3bcfc330e42a`
   */
  private createIndexBasedMlUrl(mlGenericUrlState: MlGenericUrlState): string {
    const { globalState, appState, page, index, savedSearchId, ...restParams } = mlGenericUrlState;
    let url = `${this.params.appBasePath}/${page}`;

    if (index !== undefined && savedSearchId === undefined) {
      url = `${url}?index=${index}`;
    }
    if (index === undefined && savedSearchId !== undefined) {
      url = `${url}?savedSearchId=${savedSearchId}`;
    }

    if (!isEmpty(restParams)) {
      Object.keys(restParams).forEach((key) => {
        url = setStateToKbnUrl(
          key,
          restParams[key],
          { useHash: false, storeInHashQuery: false },
          url
        );
      });
    }

    if (globalState) {
      url = setStateToKbnUrl('_g', globalState, { useHash: false, storeInHashQuery: false }, url);
    }
    if (appState) {
      url = setStateToKbnUrl('_a', appState, { useHash: false, storeInHashQuery: false }, url);
    }
    return url;
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
