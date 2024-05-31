/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataHandler, ObservabilityFetchDataPlugins } from './typings/fetch_overview_data';

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
