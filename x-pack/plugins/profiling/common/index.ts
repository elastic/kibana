/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PLUGIN_ID = 'profiling';
export const PLUGIN_NAME = 'profiling';

export const INDEX_EVENTS = 'profiling-events-all';
export const INDEX_TRACES = 'profiling-stacktraces';
export const INDEX_FRAMES = 'profiling-stackframes';
export const INDEX_EXECUTABLES = 'profiling-executables';

const BASE_ROUTE_PATH = '/internal/profiling';

export function getRoutePaths() {
  return {
    TopN: `${BASE_ROUTE_PATH}/topn`,
    TopNContainers: `${BASE_ROUTE_PATH}/topn/containers`,
    TopNDeployments: `${BASE_ROUTE_PATH}/topn/deployments`,
    TopNFunctions: `${BASE_ROUTE_PATH}/topn/functions`,
    TopNHosts: `${BASE_ROUTE_PATH}/topn/hosts`,
    TopNThreads: `${BASE_ROUTE_PATH}/topn/threads`,
    TopNTraces: `${BASE_ROUTE_PATH}/topn/traces`,
    Flamechart: `${BASE_ROUTE_PATH}/flamechart`,
    HasSetupESResources: `${BASE_ROUTE_PATH}/setup/es_resources`,
    SetupDataCollectionInstructions: `${BASE_ROUTE_PATH}/setup/instructions`,
    StorageExplorerSummary: `${BASE_ROUTE_PATH}/storage_explorer/summary`,
    StorageExplorerHostStorageDetails: `${BASE_ROUTE_PATH}/storage_explorer/host_storage_details`,
    StorageExplorerIndicesStorageDetails: `${BASE_ROUTE_PATH}/storage_explorer/indices_storage_details`,
  };
}

export function timeRangeFromRequest(request: any): [number, number] {
  const timeFrom = parseInt(request.query.timeFrom!, 10);
  const timeTo = parseInt(request.query.timeTo!, 10);
  return [timeFrom, timeTo];
}

export const NOT_AVAILABLE_LABEL = i18n.translate('xpack.profiling.notAvailableLabel', {
  defaultMessage: 'N/A',
});
