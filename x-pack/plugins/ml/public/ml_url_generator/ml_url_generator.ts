/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { CoreSetup } from 'kibana/public';
import type {
  SharePluginSetup,
  UrlGeneratorsDefinition,
  UrlGeneratorState,
} from '../../../../../src/plugins/share/public';
import type { MlStartDependencies } from '../plugin';
import { ML_PAGES, ML_APP_URL_GENERATOR } from '../../common/constants/ml_url_generator';
import type { MlUrlGeneratorState } from '../../common/types/ml_url_generator';
import {
  createAnomalyDetectionJobManagementUrl,
  createAnomalyDetectionCreateJobSelectType,
  createAnomalyDetectionCreateJobSelectIndex,
  createExplorerUrl,
  createSingleMetricViewerUrl,
} from './anomaly_detection_urls_generator';
import {
  createDataFrameAnalyticsJobManagementUrl,
  createDataFrameAnalyticsExplorationUrl,
  createDataFrameAnalyticsMapUrl,
} from './data_frame_analytics_urls_generator';
import { createGenericMlUrl } from './common';
import { createEditCalendarUrl, createEditFilterUrl } from './settings_urls_generator';

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

  public readonly createUrl = async (
    mlUrlGeneratorParams: MlUrlGeneratorState
  ): Promise<string> => {
    const { excludeBasePath, ...mlUrlGeneratorState } = mlUrlGeneratorParams;
    const appBasePath = excludeBasePath === true ? '' : this.params.appBasePath;

    switch (mlUrlGeneratorState.page) {
      case ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE:
        return createAnomalyDetectionJobManagementUrl(appBasePath, mlUrlGeneratorState.pageState);
      case ML_PAGES.ANOMALY_EXPLORER:
        return createExplorerUrl(appBasePath, mlUrlGeneratorState.pageState);
      case ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_TYPE:
        return createAnomalyDetectionCreateJobSelectType(
          appBasePath,
          mlUrlGeneratorState.pageState
        );
      case ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_INDEX:
        return createAnomalyDetectionCreateJobSelectIndex(
          appBasePath,
          mlUrlGeneratorState.pageState
        );
      case ML_PAGES.SINGLE_METRIC_VIEWER:
        return createSingleMetricViewerUrl(appBasePath, mlUrlGeneratorState.pageState);
      case ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE:
        return createDataFrameAnalyticsJobManagementUrl(appBasePath, mlUrlGeneratorState.pageState);
      // @ts-ignore // TODO: fix type
      case ML_PAGES.DATA_FRAME_ANALYTICS_MAP:
        // @ts-ignore // TODO: fix type
        return createDataFrameAnalyticsMapUrl(appBasePath, mlUrlGeneratorState.pageState);
      case ML_PAGES.DATA_FRAME_ANALYTICS_EXPLORATION:
        return createDataFrameAnalyticsExplorationUrl(appBasePath, mlUrlGeneratorState.pageState);
      case ML_PAGES.ANOMALY_DETECTION_CREATE_JOB:
      case ML_PAGES.DATA_VISUALIZER:
      case ML_PAGES.DATA_VISUALIZER_FILE:
      case ML_PAGES.DATA_VISUALIZER_INDEX_VIEWER:
      case ML_PAGES.DATA_VISUALIZER_INDEX_SELECT:
      case ML_PAGES.OVERVIEW:
      case ML_PAGES.SETTINGS:
      case ML_PAGES.FILTER_LISTS_MANAGE:
      case ML_PAGES.FILTER_LISTS_NEW:
      case ML_PAGES.CALENDARS_MANAGE:
      case ML_PAGES.CALENDARS_NEW:
      case ML_PAGES.ACCESS_DENIED:
        return createGenericMlUrl(
          appBasePath,
          mlUrlGeneratorState.page,
          mlUrlGeneratorState.pageState
        );
      case ML_PAGES.FILTER_LISTS_EDIT:
        return createEditFilterUrl(appBasePath, mlUrlGeneratorState.pageState);
      case ML_PAGES.CALENDARS_EDIT:
        return createEditCalendarUrl(appBasePath, mlUrlGeneratorState.pageState);

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
  return share.urlGenerators.registerUrlGenerator(
    new MlUrlGenerator({
      appBasePath: baseUrl,
      useHash: core.uiSettings.get('state:storeInSessionStorage'),
    })
  );
}
