/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';
import { cloneDeep, isEmpty } from 'lodash';

import { HttpLogic } from '../../../shared/http';
import { Schema, SchemaConflicts } from '../../../shared/types';
import { flashAPIErrors } from '../../../shared/flash_messages';

import { Result } from '../result/types';
import { EngineLogic } from '../engine';

import { SearchSettings } from './types';
interface RelevanceTuningProps {
  searchSettings: SearchSettings;
  schema: Schema;
  schemaConflicts: SchemaConflicts;
}

interface RelevanceTuningActions {
  onInitializeRelevanceTuning(props: RelevanceTuningProps): RelevanceTuningProps;
  setSearchSettings(searchSettings: SearchSettings): { searchSettings: SearchSettings };
  setFilterValue(value: string): string;
  setSearchQuery(value: string): string;
  setSearchResults(searchResults: Result[]): Result[];
  setResultsLoading(resultsLoading: boolean): boolean;
  clearSearchResults(): void;
  resetSearchSettingsState(): void;
  dismissSchemaConflictCallout(): void;
  initializeRelevanceTuning(): void;
  getSearchResults(): void;
  setSearchSettingsResponse(searchSettings: SearchSettings): { searchSettings: SearchSettings };
  onSearchSettingsSuccess(searchSettings: SearchSettings): { searchSettings: SearchSettings };
  onSearchSettingsError(): void;
}

interface RelevanceTuningValues {
  searchSettings: Partial<SearchSettings>;
  schema: Schema;
  schemaFields: string[];
  schemaFieldsWithConflicts: string[];
  filteredSchemaFields: string[];
  filteredSchemaFieldsWithConflicts: string[];
  schemaConflicts: SchemaConflicts;
  showSchemaConflictCallout: boolean;
  engineHasSchemaFields: boolean;
  filterInputValue: string;
  query: string;
  unsavedChanges: boolean;
  dataLoading: boolean;
  searchResults: Result[] | null;
  resultsLoading: boolean;
}

// If the user hasn't entered a filter, then we can skip filtering the array entirely
const filterIfTerm = (array: string[], filterTerm: string): string[] => {
  return filterTerm === '' ? array : array.filter((item) => item.includes(filterTerm));
};

const removeBoostStateProps = (searchSettings: Partial<SearchSettings>) => {
  const updatedSettings = cloneDeep(searchSettings);
  const { boosts } = updatedSettings;
  const keys = Object.keys(boosts || {});
  keys.forEach((key) => (boosts || {})[key].forEach((boost) => delete boost.newBoost));

  return updatedSettings;
};

export const RelevanceTuningLogic = kea<
  MakeLogicType<RelevanceTuningValues, RelevanceTuningActions>
>({
  path: ['enterprise_search', 'app_search', 'relevance_tuning_logic'],
  actions: () => ({
    onInitializeRelevanceTuning: (props) => props,
    setSearchSettings: (searchSettings) => ({ searchSettings }),
    setFilterValue: (value) => value,
    setSearchQuery: (query) => query,
    setSearchResults: (searchResults) => searchResults,
    setResultsLoading: (resultsLoading) => resultsLoading,
    clearSearchResults: true,
    resetSearchSettingsState: true,
    dismissSchemaConflictCallout: true,
    initializeRelevanceTuning: true,
    getSearchResults: true,
    setSearchSettingsResponse: (searchSettings) => ({
      searchSettings,
    }),
    onSearchSettingsSuccess: (searchSettings) => ({ searchSettings }),
    onSearchSettingsError: () => true,
  }),
  reducers: () => ({
    searchSettings: [
      {},
      {
        onInitializeRelevanceTuning: (_, { searchSettings }) => searchSettings,
        setSearchSettings: (_, { searchSettings }) => searchSettings,
        setSearchSettingsResponse: (_, { searchSettings }) => searchSettings,
      },
    ],
    schema: [
      {},
      {
        onInitializeRelevanceTuning: (_, { schema }) => schema,
      },
    ],
    schemaConflicts: [
      {},
      {
        onInitializeRelevanceTuning: (_, { schemaConflicts }) => schemaConflicts,
      },
    ],
    showSchemaConflictCallout: [
      true,
      {
        dismissSchemaConflictCallout: () => false,
      },
    ],
    filterInputValue: [
      '',
      {
        setFilterValue: (_, filterInputValue) => filterInputValue,
      },
    ],
    query: [
      '',
      {
        setSearchQuery: (_, query) => query,
      },
    ],
    unsavedChanges: [
      false,
      {
        setSearchSettings: () => true,
        setSearchSettingsResponse: () => false,
      },
    ],

    dataLoading: [
      true,
      {
        onInitializeRelevanceTuning: () => false,
        resetSearchSettingsState: () => true,
      },
    ],
    searchResults: [
      null,
      {
        clearSearchResults: () => null,
        setSearchResults: (_, searchResults) => searchResults,
      },
    ],
    resultsLoading: [
      false,
      {
        setResultsLoading: (_, resultsLoading) => resultsLoading,
        setSearchResults: () => false,
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    schemaFields: [() => [selectors.schema], (schema: Schema) => Object.keys(schema)],
    schemaFieldsWithConflicts: [
      () => [selectors.schemaConflicts],
      (schemaConflicts: SchemaConflicts) => Object.keys(schemaConflicts),
    ],
    filteredSchemaFields: [
      () => [selectors.schemaFields, selectors.filterInputValue],
      (schemaFields: string[], filterInputValue: string): string[] =>
        filterIfTerm(schemaFields, filterInputValue),
    ],
    filteredSchemaFieldsWithConflicts: [
      () => [selectors.schemaFieldsWithConflicts, selectors.filterInputValue],
      (schemaFieldsWithConflicts: string[], filterInputValue: string): string[] =>
        filterIfTerm(schemaFieldsWithConflicts, filterInputValue),
    ],
    engineHasSchemaFields: [
      () => [selectors.schema],
      (schema: Schema): boolean => Object.keys(schema).length >= 2,
    ],
  }),
  listeners: ({ actions, values }) => ({
    initializeRelevanceTuning: async () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      const url = `/api/app_search/engines/${engineName}/search_settings/details`;

      try {
        const response = await http.get(url);
        actions.onInitializeRelevanceTuning(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    getSearchResults: async (_, breakpoint) => {
      await breakpoint(250);

      const { engineName } = EngineLogic.values;
      const { http } = HttpLogic.values;
      const query = values.query;
      const { search_fields: searchFields, boosts } = removeBoostStateProps(values.searchSettings);
      if (!query) {
        return actions.clearSearchResults();
      }
      actions.setResultsLoading(true);
      const url = `/api/app_search/engines/${engineName}/search_settings_search`;

      try {
        const response = await http.post(url, {
          query: {
            query,
          },
          body: JSON.stringify({
            boosts: isEmpty(boosts) ? undefined : boosts,
            search_fields: searchFields,
          }),
        });

        actions.setSearchResults(response.results);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    onSearchSettingsSuccess: ({ searchSettings }) => {
      actions.setSearchSettingsResponse(searchSettings);
      actions.getSearchResults();
      window.scrollTo(0, 0);
    },
    onSearchSettingsError: () => {
      window.scrollTo(0, 0);
    },
  }),
});
