/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dataViewMock } from './data_view';
import { dataViewsContractMock } from './data_view_contract';
import { kibanaConfigMock } from './kibana_config';
import { deprecatedSavedSearchSimpleObjMock } from './saved_search';
import { SavedSearch } from '@kbn/saved-search-plugin/public';

const mockSavedSearch: SavedSearch = {} as unknown as SavedSearch;

export const kibanaContextValueMock = {
  combinedQuery: {
    query: 'the-query-string',
    language: 'the-query-language',
  },
  currentDataView: dataViewMock,
  deprecatedSavedSearchObj: deprecatedSavedSearchSimpleObjMock,
  selectedSavedSearch: mockSavedSearch,
  dataViewsContract: dataViewsContractMock,
  kibanaConfig: kibanaConfigMock,
};
