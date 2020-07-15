/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataHandler } from './typings/fetch_overview_data';
import { ObservabilityApp } from '../typings/common';

const dataHandlers: Partial<Record<ObservabilityApp, DataHandler>> = {};

export function registerDataHandler<T extends ObservabilityApp>({
  appName,
  fetchData,
  hasData,
}: { appName: T } & DataHandler<T>) {
  dataHandlers[appName] = { fetchData, hasData };
}

export function unregisterDataHandler<T extends ObservabilityApp>({ appName }: { appName: T }) {
  delete dataHandlers[appName];
}

export function getDataHandler<T extends ObservabilityApp>(appName: T) {
  const dataHandler = dataHandlers[appName];
  if (dataHandler) {
    return dataHandler as DataHandler<T>;
  }
}

function getPromiseResult(promiseResult: PromiseFulfilledResult<any> | PromiseRejectedResult) {
  if (promiseResult.status === 'fulfilled') {
    return promiseResult.value;
  }
  // eslint-disable-next-line no-console
  console.error('Error while fetching has data', promiseResult.reason);
  return false;
}

export async function fetchHasData(): Promise<Record<ObservabilityApp, boolean>> {
  const apps: ObservabilityApp[] = ['apm', 'uptime', 'infra_logs', 'infra_metrics'];
  const promises = apps.map((app) => getDataHandler(app)?.hasData());
  const [apm, uptime, logs, metrics] = await Promise.allSettled(promises).then((results) =>
    results.map(getPromiseResult)
  );

  return {
    apm,
    uptime,
    infra_logs: logs,
    infra_metrics: metrics,
  };
}
