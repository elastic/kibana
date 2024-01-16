/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createContext, useContext } from 'react';
import { DatasetQualityController } from '../../controller';
import { IDataStreamsStatsClient } from '../../services/data_streams_stats';

type StoreContext = Omit<DatasetQualityController, 'state$'>;

export interface DatasetQualityContextValue {
  dataStreamsStatsServiceClient: IDataStreamsStatsClient;
  store: StoreContext;
}

export const DatasetQualityContext = createContext({} as DatasetQualityContextValue);

export function useDatasetQualityContext() {
  return useContext(DatasetQualityContext);
}
