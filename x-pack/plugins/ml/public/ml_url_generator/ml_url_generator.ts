/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'kibana/public';
import {
  SharePluginSetup,
  UrlGeneratorsDefinition,
  UrlGeneratorState,
} from '../../../../../src/plugins/share/public';
import { MlStartDependencies } from '../plugin';
import { ML_PAGES, ML_APP_URL_GENERATOR } from '../../common/constants/ml_url_generator';
import {
  MlUrlGeneratorState,
  AnomalyDetectionUrlState,
  ExplorerUrlState,
  TimeSeriesExplorerUrlState,
  DataFrameAnalyticsUrlState,
  DataFrameAnalyticsExplorationUrlState,
  DataVisualizerUrlState,
  MlGenericUrlState,
} from '../../common/types/ml_url_generator';
import {
  createAnomalyDetectionJobManagementUrl,
  createAnomalyDetectionCreatJobSelectType,
  createExplorerUrl,
  createSingleMetricViewerUrl,
} from './anomaly_detection_urls_generator';
import {
  createDataframeAnalyticsUrl,
  createDataframeAnalyticsExplorationUrl,
} from './dataframe_analytics_urls_generator';
import {
  createIndexDataVisualizerUrl,
  createDataVisualizerUrl,
} from './data_visualizer_urls_generator';

declare module '../../../../../src/plugins/share/public' {
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
    const appBasePath = this.params.appBasePath;
    switch (mlUrlGeneratorState.page) {
      case ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE:
        return createAnomalyDetectionJobManagementUrl(
          appBasePath,
          mlUrlGeneratorState as AnomalyDetectionUrlState
        );
      case ML_PAGES.ANOMALY_EXPLORER:
        return createExplorerUrl(appBasePath, mlUrlGeneratorState as ExplorerUrlState);
      case ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_TYPE:
        return createAnomalyDetectionCreatJobSelectType(
          appBasePath,
          mlUrlGeneratorState as MlGenericUrlState
        );
      case ML_PAGES.SINGLE_METRIC_VIEWER:
        return createSingleMetricViewerUrl(
          appBasePath,
          mlUrlGeneratorState as TimeSeriesExplorerUrlState
        );
      case ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE:
        return createDataframeAnalyticsUrl(
          appBasePath,
          mlUrlGeneratorState as DataFrameAnalyticsUrlState
        );
      case ML_PAGES.DATA_FRAME_ANALYTICS_EXPLORATION:
        return createDataframeAnalyticsExplorationUrl(
          appBasePath,
          mlUrlGeneratorState as DataFrameAnalyticsExplorationUrlState
        );
      case ML_PAGES.DATA_VISUALIZER:
      case ML_PAGES.DATA_VISUALIZER_FILE:
      case ML_PAGES.DATA_VISUALIZER_INDEX_SELECT:
        return createDataVisualizerUrl(appBasePath, mlUrlGeneratorState as DataVisualizerUrlState);
      case ML_PAGES.DATA_VISUALIZER_INDEX_VIEWER:
        return createIndexDataVisualizerUrl(appBasePath, mlUrlGeneratorState as MlGenericUrlState);
      default:
        throw new Error('Page type is not provided or unknown');
    }
  };
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
