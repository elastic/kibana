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

import { ActiveField } from './types';

interface InitialFieldValues {
  validFields: string[];
  validSortFields: string[];
  validFacetFields: string[];
}
interface SearchUIActions {
  loadFieldData(): void;
  onFieldDataLoaded(initialFieldValues: InitialFieldValues): InitialFieldValues;
  onActiveFieldChange(activeField: ActiveField): { activeField: ActiveField };
  onFacetFieldsChange(facetFields: string[]): { facetFields: string[] };
  onSortFieldsChange(sortFields: string[]): { sortFields: string[] };
  onTitleFieldChange(titleField: string): { titleField: string };
  onURLFieldChange(urlField: string): { urlField: string };
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
  activeField: ActiveField;
}

export const SearchUILogic = kea<MakeLogicType<SearchUIValues, SearchUIActions>>({
  path: ['enterprise_search', 'app_search', 'search_ui_logic'],
  actions: () => ({
    loadFieldData: () => true,
    onFieldDataLoaded: (initialFieldValues) => initialFieldValues,
    onActiveFieldChange: (activeField) => ({ activeField }),
    onFacetFieldsChange: (facetFields) => ({ facetFields }),
    onSortFieldsChange: (sortFields) => ({ sortFields }),
    onTitleFieldChange: (titleField) => ({ titleField }),
    onURLFieldChange: (urlField) => ({ urlField }),
  }),
  reducers: () => ({
    dataLoading: [
      true,
      {
        onFieldDataLoaded: () => false,
      },
    ],
    validFields: [[], { onFieldDataLoaded: (_, { validFields }) => validFields }],
    validSortFields: [[], { onFieldDataLoaded: (_, { validSortFields }) => validSortFields }],
    validFacetFields: [[], { onFieldDataLoaded: (_, { validFacetFields }) => validFacetFields }],
    titleField: ['', { onTitleFieldChange: (_, { titleField }) => titleField }],
    urlField: ['', { onURLFieldChange: (_, { urlField }) => urlField }],
    facetFields: [[], { onFacetFieldsChange: (_, { facetFields }) => facetFields }],
    sortFields: [[], { onSortFieldsChange: (_, { sortFields }) => sortFields }],
    activeField: [ActiveField.None, { onActiveFieldChange: (_, { activeField }) => activeField }],
  }),
  listeners: ({ actions }) => ({
    loadFieldData: async () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      const url = `/api/app_search/engines/${engineName}/search_ui/field_config`;

      try {
        const initialFieldValues = await http.get(url);

        actions.onFieldDataLoaded(initialFieldValues);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
