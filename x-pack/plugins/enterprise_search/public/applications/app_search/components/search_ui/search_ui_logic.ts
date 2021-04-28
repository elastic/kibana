/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

interface InitialFieldValues {
  validFields: string[];
  validSortFields: string[];
  validFacetFields: string[];
}
interface SearchUIActions {
  dataInitialized(initialFieldValues: InitialFieldValues): InitialFieldValues;
}

interface SearchUIValues {
  dataLoading: boolean;
  validFields: string[];
  validSortFields: string[];
  validFacetFields: string[];
}

export const SearchUILogic = kea<MakeLogicType<SearchUIValues, SearchUIActions>>({
  path: ['enterprise_search', 'app_search', 'search_ui_logic'],
  actions: () => ({
    dataInitialized: (initialFieldValues) => initialFieldValues,
  }),
  reducers: () => ({
    dataLoading: [
      true,
      {
        dataInitialized: () => false,
      },
    ],
    validFields: [[], { dataInitialized: (_, { validFields }) => validFields }],
    validSortFields: [[], { dataInitialized: (_, { validSortFields }) => validSortFields }],
    validFacetFields: [[], { dataInitialized: (_, { validFacetFields }) => validFacetFields }],
  }),
});
