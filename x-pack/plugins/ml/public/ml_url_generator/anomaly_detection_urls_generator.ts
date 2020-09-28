/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Prefer importing entire lodash library, e.g. import { get } from "lodash"
// eslint-disable-next-line no-restricted-imports
import isEmpty from 'lodash/isEmpty';
import {
  AnomalyDetectionQueryState,
  AnomalyDetectionUrlState,
  ExplorerAppState,
  ExplorerGlobalState,
  ExplorerUrlState,
  MlCommonGlobalState,
  MlGenericUrlState,
  TimeSeriesExplorerAppState,
  TimeSeriesExplorerGlobalState,
  TimeSeriesExplorerUrlState,
} from '../../common/types/ml_url_generator';
import { ML_PAGES } from '../../common/constants/ml_url_generator';
import { createGenericMlUrl } from './common';
import { setStateToKbnUrl } from '../../../../../src/plugins/kibana_utils/public';
/**
 * Creates URL to the Anomaly Detection Job management page
 */
export function createAnomalyDetectionJobManagementUrl(
  appBasePath: string,
  params: AnomalyDetectionUrlState['pageState']
): string {
  let url = `${appBasePath}/${ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE}`;
  if (!params || isEmpty(params)) {
    return url;
  }
  const { jobId, groupIds, globalState } = params;
  if (jobId || groupIds) {
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

export function createAnomalyDetectionCreateJobSelectType(
  appBasePath: string,
  pageState: MlGenericUrlState['pageState']
): string {
  return createGenericMlUrl(
    appBasePath,
    ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_TYPE,
    pageState
  );
}

export function createAnomalyDetectionCreateJobSelectIndex(
  appBasePath: string,
  pageState: MlGenericUrlState['pageState']
): string {
  return createGenericMlUrl(
    appBasePath,
    ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_INDEX,
    pageState
  );
}

/**
 * Creates URL to the Anomaly Explorer page
 */
export function createExplorerUrl(
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
  url = setStateToKbnUrl<Partial<ExplorerAppState>>(
    '_a',
    appState,
    { useHash: false, storeInHashQuery: false },
    url
  );

  return url;
}

/**
 * Creates URL to the SingleMetricViewer page
 */
export function createSingleMetricViewerUrl(
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
    zoom,
    query,
    detectorIndex,
    forecastId,
    entities,
    globalState,
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
  appState.mlTimeSeriesExplorer = mlTimeSeriesExplorer;

  if (zoom) appState.zoom = zoom;
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
  url = setStateToKbnUrl<TimeSeriesExplorerAppState>(
    '_a',
    appState,
    { useHash: false, storeInHashQuery: false },
    url
  );

  return url;
}
