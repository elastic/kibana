/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import isEmpty from 'lodash/isEmpty';
import {
  AnomalyDetectionQueryState,
  AnomalyDetectionUrlState,
  ExplorerAppState,
  ExplorerGlobalState,
  ExplorerUrlState,
  MlGenericUrlState,
  TimeSeriesExplorerAppState,
  TimeSeriesExplorerGlobalState,
  TimeSeriesExplorerUrlState,
} from '../../common/types/ml_url_generator';
import { ML_PAGES } from '../../common/constants/ml_url_generator';
import { extractParams, createIndexBasedMlUrl } from './common';
import { setStateToKbnUrl } from '../../../../../src/plugins/kibana_utils/public';
/**
 * Creates URL to the Anomaly Detection Job management page
 */
export function createAnomalyDetectionJobManagementUrl(
  appBasePath: string,
  mlUrlGeneratorState: AnomalyDetectionUrlState
): string {
  const { params } = extractParams<AnomalyDetectionUrlState>(mlUrlGeneratorState);
  let url = `${appBasePath}/${ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE}`;
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

export function createAnomalyDetectionCreateJobSelectType(
  appBasePath: string,
  mlGenericUrlState: MlGenericUrlState
): string {
  return createIndexBasedMlUrl(appBasePath, mlGenericUrlState);
}

/**
 * Creates URL to the Anomaly Explorer page
 */
export function createExplorerUrl(
  appBasePath: string,
  {
    refreshInterval,
    timeRange,
    jobIds,
    query,
    mlExplorerSwimlane = {},
    mlExplorerFilter = {},
  }: ExplorerUrlState
): string {
  let url = `${appBasePath}/${ML_PAGES.ANOMALY_EXPLORER}`;

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
export function createSingleMetricViewerUrl(
  appBasePath: string,
  {
    timeRange,
    jobIds,
    refreshInterval,
    zoom,
    query,
    detectorIndex,
    entities,
  }: TimeSeriesExplorerUrlState
): string {
  let url = `${appBasePath}/${ML_PAGES.SINGLE_METRIC_VIEWER}`;
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
