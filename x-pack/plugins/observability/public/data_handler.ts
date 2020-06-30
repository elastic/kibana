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

export function getDataHandler<T extends ObservabilityApp>(appName: T) {
  const dataHandler = dataHandlers[appName];
  if (dataHandler) {
    return dataHandler as DataHandler<T>;
  }
}
