/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea, MakeLogicType } from 'kea';

import { Schema, SchemaConflicts } from '../../../shared/types';
import { ISearchSettings } from './types';

interface ISearchSettingsProps {
  searchSettings: ISearchSettings;
  schema: Schema;
  schemaConflicts: SchemaConflicts;
}

interface ISearchSettingsActions {
  onInitializeSearchSettings(props: ISearchSettingsProps): ISearchSettingsProps;
  setSearchSettings(searchSettings: ISearchSettings): { searchSettings: ISearchSettings };
  setFilterValue(value: string): string;
  setSearchQuery(value: string): string;
  setSearchResults(searchResults: object[]): object[];
  setResultsLoading(resultsLoading: boolean): boolean;
  clearSearchResults(): void;
  resetSearchSettingsState(): void;
  dismissSchemaConflictCallout(): void;
}

interface ISearchSettingsValues {
  searchSettings: Partial<ISearchSettings>;
  schema: Schema;
  dataLoading: boolean;
  schemaConflicts: SchemaConflicts;
  unsavedChanges: boolean;
  filterInputValue: string;
  query: string;
  searchResults: object[] | null;
  resultsLoading: boolean;
  showSchemaConflictCallout: boolean;
  engineHasSchemaFields: boolean;
  schemaFields: string[];
  schemaFieldsWithConflicts: string[];
  filteredSchemaFields: string[];
  filteredSchemaFieldsWithConflicts: string[];
}

// If the user hasn't entered a filter, then we can skip filtering the array entirely
const filterIfTerm = (array: string[], filterTerm: string): string[] => {
  return filterTerm === '' ? array : array.filter((item) => item.includes(filterTerm));
};

export const RelevanceTuningLogic = kea<
  MakeLogicType<ISearchSettingsValues, ISearchSettingsActions>
>({
  path: ['enterprise_search', 'app_search', 'relevance_tuning_logic'],
  actions: () => ({
    onInitializeSearchSettings: (props) => props,
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
        onInitializeSearchSettings: (_, { searchSettings }) => searchSettings,
        setSearchSettings: (_, { searchSettings }) => searchSettings,
      },
    ],
    schema: [
      {},
      {
        onInitializeSearchSettings: (_, { schema }) => schema,
      },
    ],
    dataLoading: [
      true,
      {
        onInitializeSearchSettings: () => false,
        resetSearchSettingsState: () => true,
      },
    ],
    schemaConflicts: [
      {},
      {
        onInitializeSearchSettings: (_, { schemaConflicts }) => schemaConflicts,
      },
    ],
    unsavedChanges: [
      false,
      {
        setSearchSettings: () => true,
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
    resultsLoading: [
      false,
      {
        setResultsLoading: (_, resultsLoading) => resultsLoading,
        setSearchResults: () => false,
      },
    ],
    searchResults: [
      null,
      {
        clearSearchResults: () => null,
        setSearchResults: (_, searchResults) => searchResults,
      },
    ],
    showSchemaConflictCallout: [
      true,
      {
        dismissSchemaConflictCallout: () => false,
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    engineHasSchemaFields: [
      () => [selectors.schema],
      (schema: Schema): boolean => Object.keys(schema).length >= 2,
    ],
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
  }),
});
