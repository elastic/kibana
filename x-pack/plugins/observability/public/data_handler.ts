/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FetchData, HasData } from './typings/data_handler';
import { ObservabilityApp } from '../typings/common';

interface DataHandler {
  fetchData: FetchData;
  hasData: HasData;
}

const dataHandlers: Partial<Record<ObservabilityApp, DataHandler>> = {};

export type RegisterDataHandler = (params: { appName: ObservabilityApp } & DataHandler) => void;
export const registerDataHandler: RegisterDataHandler = ({ appName, fetchData, hasData }) => {
  dataHandlers[appName] = { fetchData, hasData };
};

export function getDataHandler(appName: ObservabilityApp): DataHandler | undefined {
  return dataHandlers[appName];
}
