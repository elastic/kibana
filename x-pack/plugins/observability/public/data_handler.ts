/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataHandler, ObservabilityFetchDataPlugins } from './typings/fetch_overview_data';
import { useFetcher } from './hooks/use_fetcher';

const dataHandlers: Partial<Record<ObservabilityFetchDataPlugins, DataHandler>> = {};

export function registerDataHandler<T extends ObservabilityFetchDataPlugins>({
  appName,
  fetchData,
  hasData,
}: { appName: T } & DataHandler<T>) {
  dataHandlers[appName] = { fetchData, hasData };
}

export function unregisterDataHandler<T extends ObservabilityFetchDataPlugins>({
  appName,
}: {
  appName: T;
}) {
  delete dataHandlers[appName];
}

export function getDataHandler<T extends ObservabilityFetchDataPlugins>(appName: T) {
  const dataHandler = dataHandlers[appName];
  if (dataHandler) {
    return dataHandler as DataHandler<T>;
  }
}

export function useInfraLogsHasData() {
  return useFetcher(() => getDataHandler('infra_logs')?.hasData(), []);
}

export function useInfraMetricsHasData() {
  return useFetcher(() => getDataHandler('infra_metrics')?.hasData(), []);
}

export function useApmHasData() {
  return useFetcher(() => getDataHandler('apm')?.hasData(), []);
}

export function useUptimeHasData() {
  return useFetcher(() => getDataHandler('uptime')?.hasData(), []);
}

export function useUxHasData() {
  return useFetcher(() => getDataHandler('ux')?.hasData(), []);
}
