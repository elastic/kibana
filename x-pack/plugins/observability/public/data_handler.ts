/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ObservabilityFetchDataResponse, FetchDataResponse } from './typings/fetch_data_response';
import { ObservabilityApp } from '../typings/common';

interface FetchDataParams {
  // The start timestamp in milliseconds of the queried time interval
  startTime: string;
  // The end timestamp in milliseconds of the queried time interval
  endTime: string;
  // The aggregation bucket size in milliseconds if applicable to the data source
  bucketSize: string;
}

export type FetchData<T extends FetchDataResponse = FetchDataResponse> = (
  fetchDataParams: FetchDataParams
) => Promise<T>;
export type HasData = () => Promise<boolean>;

interface DataHandler {
  fetchData: FetchData;
  hasData: HasData;
}

const dataHandlers: Partial<Record<ObservabilityApp, DataHandler>> = {};

export type RegisterDataHandler<T extends ObservabilityApp = ObservabilityApp> = (params: {
  appName: T;
  fetchData: FetchData<ObservabilityFetchDataResponse[T]>;
  hasData: HasData;
}) => void;

export const registerDataHandler: RegisterDataHandler = ({ appName, fetchData, hasData }) => {
  dataHandlers[appName] = { fetchData, hasData };
};

export function getDataHandler(appName: ObservabilityApp): DataHandler | undefined {
  return dataHandlers[appName];
}
