/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Schema, SchemaConflicts } from '../../../shared/types';

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
  setSearchResults(searchResults: object[]): object[];
  setResultsLoading(resultsLoading: boolean): boolean;
  clearSearchResults(): void;
  resetSearchSettingsState(): void;
  dismissSchemaConflictCallout(): void;
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
  searchResults: object[] | null;
  resultsLoading: boolean;
}

// If the user hasn't entered a filter, then we can skip filtering the array entirely
const filterIfTerm = (array: string[], filterTerm: string): string[] => {
  return filterTerm === '' ? array : array.filter((item) => item.includes(filterTerm));
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
  }),
  reducers: () => ({
    searchSettings: [
      {},
      {
        onInitializeRelevanceTuning: (_, { searchSettings }) => searchSettings,
        setSearchSettings: (_, { searchSettings }) => searchSettings,
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
});
