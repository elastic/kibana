/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import type {
  AnomalyDetectionUrlState,
  ExplorerAppState,
  ExplorerGlobalState,
  ExplorerUrlState,
  MlCommonGlobalState,
  MlGenericUrlState,
  TimeSeriesExplorerAppState,
  TimeSeriesExplorerGlobalState,
  TimeSeriesExplorerUrlState,
} from '../../../common/types/locator';
import { ML_PAGES } from '../../../common/constants/locator';
import { formatGenericMlUrl } from './common';
import { getGroupQueryText, getJobQueryText } from '../../../common/util/string_utils';
import { AppPageState, ListingPageUrlState } from '../../../common/types/common';

/**
 * Creates URL to the Anomaly Detection Job management page
 */
export function formatAnomalyDetectionJobManagementUrl(
  appBasePath: string,
  params: AnomalyDetectionUrlState['pageState']
): string {
  let url = `${appBasePath}/${ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE}`;
  if (!params || isEmpty(params)) {
    return url;
  }
  const { jobId, groupIds, globalState } = params;
  if (jobId || groupIds) {
    const queryTextArr = [];
    if (jobId) {
      queryTextArr.push(getJobQueryText(jobId));
    }
    if (groupIds) {
      queryTextArr.push(getGroupQueryText(groupIds));
    }
    const jobsListState: Partial<ListingPageUrlState> = {
      ...(queryTextArr.length > 0 ? { queryText: queryTextArr.join(' ') } : {}),
    };

    const queryState: AppPageState<ListingPageUrlState> = {
      [ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE]: jobsListState,
    };

    url = setStateToKbnUrl<AppPageState<ListingPageUrlState>>(
      '_a',
      queryState,
      { useHash: false, storeInHashQuery: false },
      url
    );
  }

  if (globalState) {
    url = setStateToKbnUrl<Partial<MlCommonGlobalState>>(
      '_g',
      globalState,
      { useHash: false, storeInHashQuery: false },
      url
    );
  }
  return url;
}

export function formatAnomalyDetectionCreateJobSelectType(
  appBasePath: string,
  pageState: MlGenericUrlState['pageState']
): string {
  return formatGenericMlUrl(
    appBasePath,
    ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_TYPE,
    pageState
  );
}

export function formatAnomalyDetectionCreateJobSelectIndex(
  appBasePath: string,
  pageState: MlGenericUrlState['pageState']
): string {
  return formatGenericMlUrl(
    appBasePath,
    ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_INDEX,
    pageState
  );
}

/**
 * Creates URL to the Anomaly Explorer page
 */
export function formatExplorerUrl(
  appBasePath: string,
  params: ExplorerUrlState['pageState']
): string {
  let url = `${appBasePath}/${ML_PAGES.ANOMALY_EXPLORER}`;

  if (!params) {
    return url;
  }
  const {
    refreshInterval,
    timeRange,
    jobIds,
    query,
    mlExplorerSwimlane = {},
    mlExplorerFilter = {},
    globalState,
  } = params;
  const appState: Partial<ExplorerAppState> = {
    mlExplorerSwimlane,
    mlExplorerFilter,
  };
  let queryState: Partial<ExplorerGlobalState> = {};
  if (globalState) queryState = globalState;
  if (query) appState.query = query;
  if (jobIds) {
    queryState.ml = {
      jobIds,
    };
  }
  if (refreshInterval) queryState.refreshInterval = refreshInterval;
  if (timeRange) queryState.time = timeRange;

  url = setStateToKbnUrl<Partial<ExplorerGlobalState>>(
    '_g',
    queryState,
    { useHash: false, storeInHashQuery: false },
    url
  );
  url = setStateToKbnUrl<AppPageState<Partial<ExplorerAppState>>>(
    '_a',
    { [ML_PAGES.ANOMALY_EXPLORER]: appState },
    { useHash: false, storeInHashQuery: false },
    url
  );

  return url;
}

/**
 * Creates URL to the SingleMetricViewer page
 */
export function formatSingleMetricViewerUrl(
  appBasePath: string,
  params: TimeSeriesExplorerUrlState['pageState']
): string {
  let url = `${appBasePath}/${ML_PAGES.SINGLE_METRIC_VIEWER}`;
  if (!params) {
    return url;
  }
  const {
    timeRange,
    jobIds,
    refreshInterval,
    query,
    detectorIndex,
    forecastId,
    entities,
    globalState,
    functionDescription,
    zoom,
  } = params;

  let queryState: Partial<TimeSeriesExplorerGlobalState> = {};
  if (globalState) queryState = globalState;

  if (jobIds) {
    queryState.ml = {
      jobIds,
    };
  }
  if (refreshInterval) queryState.refreshInterval = refreshInterval;
  if (timeRange) queryState.time = timeRange;

  const appState: Partial<TimeSeriesExplorerAppState> = {};
  const mlTimeSeriesExplorer: Partial<TimeSeriesExplorerAppState['mlTimeSeriesExplorer']> = {};

  if (forecastId !== undefined) {
    mlTimeSeriesExplorer.forecastId = forecastId;
  }

  if (detectorIndex !== undefined) {
    mlTimeSeriesExplorer.detectorIndex = detectorIndex;
  }
  if (entities !== undefined) {
    mlTimeSeriesExplorer.entities = entities;
  }
  if (functionDescription !== undefined) {
    mlTimeSeriesExplorer.functionDescription = functionDescription;
  }

  if (zoom !== undefined) {
    mlTimeSeriesExplorer.zoom = zoom;
  }

  appState.mlTimeSeriesExplorer = mlTimeSeriesExplorer;

  if (query)
    appState.query = {
      query_string: query,
    };
  url = setStateToKbnUrl<Partial<TimeSeriesExplorerGlobalState>>(
    '_g',
    queryState,
    { useHash: false, storeInHashQuery: false },
    url
  );
  url = setStateToKbnUrl<AppPageState<Partial<TimeSeriesExplorerAppState>>>(
    '_a',
    { [ML_PAGES.SINGLE_METRIC_VIEWER]: appState },
    { useHash: false, storeInHashQuery: false },
    url
  );

  return url;
}
