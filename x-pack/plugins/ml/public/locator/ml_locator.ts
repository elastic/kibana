/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorDefinition, KibanaLocation } from '@kbn/share-plugin/public';
import { formatChangePointDetectionUrl } from './formatters/aiops';
import { formatNotificationsUrl } from './formatters/notifications';
import type {
  DataFrameAnalyticsExplorationUrlState,
  MlLocatorParams,
  MlLocator,
  ChangePointDetectionQueryState,
} from '../../common/types/locator';
import { ML_APP_LOCATOR, ML_PAGES } from '../../common/constants/locator';
import {
  formatAnomalyDetectionCreateJobSelectIndex,
  formatAnomalyDetectionCreateJobSelectType,
  formatAnomalyDetectionJobManagementUrl,
  formatSuppliedConfigurationsManagementUrl,
  formatExplorerUrl,
  formatSingleMetricViewerUrl,
  formatDataFrameAnalyticsCreateJobUrl,
  formatDataFrameAnalyticsExplorationUrl,
  formatDataFrameAnalyticsJobManagementUrl,
  formatDataFrameAnalyticsMapUrl,
  formatGenericMlUrl,
  formatEditCalendarUrl,
  formatEditFilterUrl,
} from './formatters';
import {
  formatTrainedModelsManagementUrl,
  formatMemoryUsageUrl,
} from './formatters/trained_models';

export type { MlLocatorParams, MlLocator };

export class MlLocatorDefinition implements LocatorDefinition<MlLocatorParams> {
  public readonly id = ML_APP_LOCATOR;

  public readonly getLocation = async (params: MlLocatorParams): Promise<KibanaLocation> => {
    let path: string = '';

    switch (params.page) {
      case ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE:
        path = formatAnomalyDetectionJobManagementUrl('', params.pageState);
        break;
      case ML_PAGES.SUPPLIED_CONFIGURATIONS:
        path = formatSuppliedConfigurationsManagementUrl('', params.pageState);
        break;
      case ML_PAGES.ANOMALY_EXPLORER:
        path = formatExplorerUrl('', params.pageState);
        break;
      case ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_TYPE:
        path = formatAnomalyDetectionCreateJobSelectType('', params.pageState);
        break;
      case ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_INDEX:
        path = formatAnomalyDetectionCreateJobSelectIndex('', params.pageState);
        break;
      case ML_PAGES.SINGLE_METRIC_VIEWER:
        path = formatSingleMetricViewerUrl('', params.pageState);
        break;
      case ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE:
        path = formatDataFrameAnalyticsJobManagementUrl('', params.pageState);
        break;
      case ML_PAGES.DATA_FRAME_ANALYTICS_CREATE_JOB:
        path = formatDataFrameAnalyticsCreateJobUrl('', params.pageState);
        break;
      case ML_PAGES.DATA_FRAME_ANALYTICS_MAP:
        path = formatDataFrameAnalyticsMapUrl(
          '',
          params.pageState as DataFrameAnalyticsExplorationUrlState['pageState']
        );
        break;
      case ML_PAGES.DATA_FRAME_ANALYTICS_EXPLORATION:
        path = formatDataFrameAnalyticsExplorationUrl('', params.pageState);
        break;
      case ML_PAGES.TRAINED_MODELS_MANAGE:
        path = formatTrainedModelsManagementUrl('', params.pageState);
        break;
      case ML_PAGES.MEMORY_USAGE:
        path = formatMemoryUsageUrl('', params.pageState);
        break;
      case ML_PAGES.AIOPS_CHANGE_POINT_DETECTION:
        path = formatChangePointDetectionUrl(
          '',
          params.pageState as ChangePointDetectionQueryState
        );
        break;
      case ML_PAGES.DATA_DRIFT_INDEX_SELECT:
      case ML_PAGES.DATA_DRIFT_CUSTOM:
      case ML_PAGES.DATA_DRIFT:
      case ML_PAGES.ANOMALY_DETECTION_CREATE_JOB:
      case ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_RECOGNIZER:
      case ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_ADVANCED:
      case ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_FROM_LENS:
      case ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_FROM_MAP:
      case ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_FROM_PATTERN_ANALYSIS:
      case ML_PAGES.DATA_VISUALIZER:
      case ML_PAGES.DATA_VISUALIZER_FILE:
      case ML_PAGES.DATA_VISUALIZER_ESQL:
      case ML_PAGES.DATA_VISUALIZER_INDEX_VIEWER:
      case ML_PAGES.DATA_VISUALIZER_INDEX_SELECT:
      case ML_PAGES.AIOPS:
      case ML_PAGES.AIOPS_LOG_RATE_ANALYSIS:
      case ML_PAGES.AIOPS_LOG_RATE_ANALYSIS_INDEX_SELECT:
      case ML_PAGES.AIOPS_LOG_CATEGORIZATION:
      case ML_PAGES.AIOPS_LOG_CATEGORIZATION_INDEX_SELECT:
      case ML_PAGES.AIOPS_CHANGE_POINT_DETECTION_INDEX_SELECT:
      case ML_PAGES.OVERVIEW:
      case ML_PAGES.SETTINGS:
      case ML_PAGES.FILTER_LISTS_MANAGE:
      case ML_PAGES.FILTER_LISTS_NEW:
      case ML_PAGES.CALENDARS_MANAGE:
      case ML_PAGES.CALENDARS_DST_MANAGE:
      case ML_PAGES.CALENDARS_NEW:
      case ML_PAGES.CALENDARS_DST_NEW:
        path = formatGenericMlUrl('', params.page, params.pageState);
        break;
      case ML_PAGES.FILTER_LISTS_EDIT:
        path = formatEditFilterUrl('', params.pageState);
        break;
      case ML_PAGES.CALENDARS_EDIT:
      case ML_PAGES.CALENDARS_DST_EDIT:
        path = formatEditCalendarUrl('', params.pageState);
        break;
      case ML_PAGES.NOTIFICATIONS:
        path = formatNotificationsUrl('', params.pageState);
        break;

      default:
        throw new Error('Page type is not provided or unknown');
    }

    return {
      app: 'ml',
      path,
      state: {},
    };
  };
}
