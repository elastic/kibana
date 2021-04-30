/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { flashAPIErrors } from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { EngineLogic } from '../engine';

interface InitialFieldValues {
  validFields: string[];
  validSortFields: string[];
  validFacetFields: string[];
}
interface SearchUIActions {
  initializeData(): void;
  dataInitialized(initialFieldValues: InitialFieldValues): InitialFieldValues;
  titleFieldChanged(titleField: string): { titleField: string };
  URLFieldChanged(urlField: string): { urlField: string };
  facetFieldsChanged(facetFields: string[]): { facetFields: string[] };
  sortFieldsChanged(sortFields: string[]): { sortFields: string[] };
  activeFieldChanged(activeField: string): { activeField: string };
}

interface SearchUIValues {
  dataLoading: boolean;
  validFields: string[];
  validSortFields: string[];
  validFacetFields: string[];
  titleField: string;
  urlField: string;
  facetFields: string[];
  sortFields: string[];
  activeField: string;
}

export const SearchUILogic = kea<MakeLogicType<SearchUIValues, SearchUIActions>>({
  path: ['enterprise_search', 'app_search', 'search_ui_logic'],
  actions: () => ({
    initializeData: () => true,
    dataInitialized: (initialFieldValues) => initialFieldValues,
    titleFieldChanged: (titleField) => ({ titleField }),
    URLFieldChanged: (urlField) => ({ urlField }),
    facetFieldsChanged: (facetFields) => ({ facetFields }),
    sortFieldsChanged: (sortFields) => ({ sortFields }),
    activeFieldChanged: (activeField) => ({ activeField }),
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
    titleField: ['', { titleFieldChanged: (_, { titleField }) => titleField }],
    urlField: ['', { URLFieldChanged: (_, { urlField }) => urlField }],
    facetFields: [[], { facetFieldsChanged: (_, { facetFields }) => facetFields }],
    sortFields: [[], { sortFieldsChanged: (_, { sortFields }) => sortFields }],
    activeField: ['', { activeFieldChanged: (_, { activeField }) => activeField }],
  }),
  listeners: ({ actions }) => ({
    initializeData: async () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      const url = `/api/app_search/engines/${engineName}/search_ui/field_config`;

      try {
        const initialFieldValues = await http.get(url);

        actions.dataInitialized(initialFieldValues);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
