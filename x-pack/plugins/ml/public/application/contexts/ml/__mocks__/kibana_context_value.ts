/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dataViewMock } from './data_view';
import { dataViewsContractMock } from './data_view_contract';
import { kibanaConfigMock } from './kibana_config';
import { savedSearchMock } from './saved_search';

export const kibanaContextValueMock = {
  combinedQuery: {
    query: 'the-query-string',
    language: 'the-query-language',
  },
  currentDataView: dataViewMock,
  currentSavedSearch: savedSearchMock,
  dataViewsContract: dataViewsContractMock,
  kibanaConfig: kibanaConfigMock,
};
