/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  DataHandler,
  HasDataResponse,
  ObservabilityFetchDataPlugins,
} from './typings/fetch_overview_data';

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

export async function fetchHasData(absoluteTime: {
  start: number;
  end: number;
}): Promise<Record<ObservabilityFetchDataPlugins, HasDataResponse>> {
  const apps: ObservabilityFetchDataPlugins[] = [
    'apm',
    'uptime',
    'infra_logs',
    'infra_metrics',
    'ux',
  ];

  const promises = apps.map(
    async (app) =>
      getDataHandler(app)?.hasData(app === 'ux' ? { absoluteTime } : undefined) || false
  );

  const results = await Promise.allSettled(promises);

  const [apm, uptime, logs, metrics, ux] = results.map((result) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }

    console.error('Error while fetching has data', result.reason);
    return false;
  });

  return {
    apm,
    uptime,
    ux,
    infra_logs: logs,
    infra_metrics: metrics,
  };
}
