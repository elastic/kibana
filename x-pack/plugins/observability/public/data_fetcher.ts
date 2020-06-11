/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataFetcher } from './typings/data_fetcher';

type DataFetcherMap = Record<string, DataFetcher>;

const dataFetcherMap: DataFetcherMap = {};

export type Registry = (params: { name: string; dataFetcher: DataFetcher }) => void;

export const dataFetcherRegistry: Registry = ({ name, dataFetcher }) => {
  dataFetcherMap[name] = dataFetcher;
};

export function getDataFetcher(name: string): DataFetcher | undefined {
  return dataFetcherMap[name];
}
