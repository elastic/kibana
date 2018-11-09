/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';

import { DataProvider } from './timeline/data_providers/data_provider';

export interface IdToDataProvider {
  [id: string]: DataProvider;
}

const emptyIdToDataProvider: IdToDataProvider = {};

export const DataProviderContext = React.createContext({
  dataProviders: emptyIdToDataProvider,
});
