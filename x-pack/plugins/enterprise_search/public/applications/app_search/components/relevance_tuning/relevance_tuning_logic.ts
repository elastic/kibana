/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';
import { omit, cloneDeep, isEmpty } from 'lodash';

import { setSuccessMessage, flashAPIErrors } from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { Schema, SchemaConflicts } from '../../../shared/types';

import { EngineLogic } from '../engine';
import { Result } from '../result/types';

import {
  UPDATE_SUCCESS_MESSAGE,
  RESET_CONFIRMATION_MESSAGE,
  DELETE_SUCCESS_MESSAGE,
  DELETE_CONFIRMATION_MESSAGE,
} from './constants';
import {
  BaseBoost,
  Boost,
  BoostFunction,
  BoostOperation,
  BoostType,
  SearchSettings,
} from './types';
import {
  filterIfTerm,
  parseBoostCenter,
  removeBoostStateProps,
  normalizeBoostValues,
} from './utils';

interface RelevanceTuningProps {
  searchSettings: SearchSettings;
  schema: Schema;
  schemaConflicts?: SchemaConflicts;
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
  updateSearchSettings(): void;
  resetSearchSettings(): void;
  toggleSearchField(name: string, disableField: boolean): { name: string; disableField: boolean };
  updateFieldWeight(name: string, weight: number): { name: string; weight: number };
  addBoost(name: string, type: BoostType): { name: string; type: BoostType };
  deleteBoost(name: string, index: number): { name: string; index: number };
  updateBoostFactor(
    name: string,
    index: number,
    factor: number
  ): { name: string; index: number; factor: number };
  updateBoostValue(
    name: string,
    boostIndex: number,
    valueIndex: number,
    value: string
  ): { name: string; boostIndex: number; valueIndex: number; value: string };
  updateBoostCenter(
    name: string,
    boostIndex: number,
    value: string | number
  ): { name: string; boostIndex: number; value: string | number };
  addBoostValue(name: string, boostIndex: number): { name: string; boostIndex: number };
  removeBoostValue(
    name: string,
    boostIndex: number,
    valueIndex: number
  ): { name: string; boostIndex: number; valueIndex: number };
  updateBoostSelectOption(
    name: string,
    boostIndex: number,
    optionType: keyof BaseBoost,
    value: BoostOperation | BoostFunction
  ): {
    name: string;
    boostIndex: number;
    optionType: keyof BaseBoost;
    value: string;
  };
  updateSearchValue(query: string): string;
}

interface RelevanceTuningValues {
  searchSettings: SearchSettings;
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
    updateSearchSettings: true,
    resetSearchSettings: true,
    toggleSearchField: (name, disableField) => ({ name, disableField }),
    updateFieldWeight: (name, weight) => ({ name, weight }),
    addBoost: (name, type) => ({ name, type }),
    deleteBoost: (name, index) => ({ name, index }),
    updateBoostFactor: (name, index, factor) => ({ name, index, factor }),
    updateBoostValue: (name, boostIndex, valueIndex, value) => ({
      name,
      boostIndex,
      valueIndex,
      value,
    }),
    updateBoostCenter: (name, boostIndex, value) => ({ name, boostIndex, value }),
    addBoostValue: (name, boostIndex) => ({ name, boostIndex }),
    removeBoostValue: (name, boostIndex, valueIndex) => ({ name, boostIndex, valueIndex }),
    updateBoostSelectOption: (name, boostIndex, optionType, value) => ({
      name,
      boostIndex,
      optionType,
      value,
    }),
    updateSearchValue: (query) => query,
  }),
  reducers: () => ({
    searchSettings: [
      {
        search_fields: {},
        boosts: {},
      },
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
        onInitializeRelevanceTuning: (_, { schemaConflicts }) => schemaConflicts || {},
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
        actions.onInitializeRelevanceTuning({
          ...response,
          searchSettings: {
            ...response.searchSettings,
            boosts: normalizeBoostValues(response.searchSettings.boosts),
          },
        });
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    getSearchResults: async (_, breakpoint) => {
      await breakpoint(250);

      const query = values.query;
      if (!query) return actions.clearSearchResults();

      const { engineName } = EngineLogic.values;
      const { http } = HttpLogic.values;
      const { search_fields: searchFields, boosts } = removeBoostStateProps(values.searchSettings);
      const url = `/api/app_search/engines/${engineName}/search_settings_search`;

      actions.setResultsLoading(true);

      try {
        const response = await http.post(url, {
          query: {
            query,
          },
          body: JSON.stringify({
            boosts: isEmpty(boosts) ? undefined : boosts,
            search_fields: isEmpty(searchFields) ? undefined : searchFields,
          }),
        });

        actions.setSearchResults(response.results);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    setSearchSettings: () => {
      actions.getSearchResults();
    },
    onSearchSettingsSuccess: ({ searchSettings }) => {
      actions.setSearchSettingsResponse(searchSettings);
      actions.getSearchResults();
      window.scrollTo(0, 0);
    },
    onSearchSettingsError: () => {
      window.scrollTo(0, 0);
    },
    updateSearchSettings: async () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      const url = `/api/app_search/engines/${engineName}/search_settings`;

      try {
        const response = await http.put(url, {
          body: JSON.stringify(removeBoostStateProps(values.searchSettings)),
        });
        setSuccessMessage(UPDATE_SUCCESS_MESSAGE);
        actions.onSearchSettingsSuccess(response);
      } catch (e) {
        flashAPIErrors(e);
        actions.onSearchSettingsError();
      }
    },
    resetSearchSettings: async () => {
      if (window.confirm(RESET_CONFIRMATION_MESSAGE)) {
        const { http } = HttpLogic.values;
        const { engineName } = EngineLogic.values;

        const url = `/api/app_search/engines/${engineName}/search_settings/reset`;

        try {
          const response = await http.post(url);
          setSuccessMessage(DELETE_SUCCESS_MESSAGE);
          actions.onSearchSettingsSuccess(response);
        } catch (e) {
          flashAPIErrors(e);
          actions.onSearchSettingsError();
        }
      }
    },
    toggleSearchField: ({ name, disableField }) => {
      const { searchSettings } = values;

      const searchFields = disableField
        ? omit(searchSettings.search_fields, name)
        : { ...searchSettings.search_fields, [name]: { weight: 1 } };

      actions.setSearchSettings({
        ...searchSettings,
        search_fields: searchFields,
      });
    },
    updateFieldWeight: ({ name, weight }) => {
      const { searchSettings } = values;
      const { search_fields: searchFields } = searchSettings;

      actions.setSearchSettings({
        ...searchSettings,
        search_fields: {
          ...searchFields,
          [name]: {
            ...searchFields[name],
            weight: Math.round(weight * 10) / 10,
          },
        },
      });
    },
    addBoost: ({ name, type }) => {
      const { searchSettings } = values;
      const { boosts } = searchSettings;
      const emptyBoost = { type, factor: 1, newBoost: true };
      let boostArray;

      if (Array.isArray(boosts[name])) {
        boostArray = boosts[name].slice();
        boostArray.push(emptyBoost);
      } else {
        boostArray = [emptyBoost];
      }

      actions.setSearchSettings({
        ...searchSettings,
        boosts: {
          ...boosts,
          [name]: boostArray,
        },
      });
    },
    deleteBoost: ({ name, index }) => {
      if (window.confirm(DELETE_CONFIRMATION_MESSAGE)) {
        const { searchSettings } = values;
        const { boosts } = searchSettings;
        const boostsRemoved = boosts[name].slice();
        boostsRemoved.splice(index, 1);
        const updatedBoosts = { ...boosts };

        if (boostsRemoved.length > 0) {
          updatedBoosts[name] = boostsRemoved;
        } else {
          delete updatedBoosts[name];
        }

        actions.setSearchSettings({
          ...searchSettings,
          boosts: updatedBoosts,
        });
      }
    },
    updateBoostFactor: ({ name, index, factor }) => {
      const { searchSettings } = values;
      const { boosts } = searchSettings;
      const updatedBoosts = cloneDeep(boosts[name]);
      updatedBoosts[index].factor = Math.round(factor * 10) / 10;

      actions.setSearchSettings({
        ...searchSettings,
        boosts: {
          ...boosts,
          [name]: updatedBoosts,
        },
      });
    },
    updateBoostValue: ({ name, boostIndex, valueIndex, value }) => {
      const { searchSettings } = values;
      const { boosts } = searchSettings;
      const updatedBoosts: Boost[] = cloneDeep(boosts[name]);
      const existingValue = updatedBoosts[boostIndex].value;
      if (existingValue === undefined) {
        updatedBoosts[boostIndex].value = [value];
      } else {
        existingValue[valueIndex] = value;
      }

      actions.setSearchSettings({
        ...searchSettings,
        boosts: {
          ...boosts,
          [name]: updatedBoosts,
        },
      });
    },
    updateBoostCenter: ({ name, boostIndex, value }) => {
      const { searchSettings } = values;
      const { boosts } = searchSettings;
      const updatedBoosts = cloneDeep(boosts[name]);
      const fieldType = values.schema[name];
      updatedBoosts[boostIndex].center = parseBoostCenter(fieldType, value);

      actions.setSearchSettings({
        ...searchSettings,
        boosts: {
          ...boosts,
          [name]: updatedBoosts,
        },
      });
    },
    addBoostValue: ({ name, boostIndex }) => {
      const { searchSettings } = values;
      const { boosts } = searchSettings;
      const updatedBoosts = cloneDeep(boosts[name]);
      const updatedBoost = updatedBoosts[boostIndex];
      if (updatedBoost) {
        updatedBoost.value = Array.isArray(updatedBoost.value) ? updatedBoost.value : [''];
        updatedBoost.value.push('');
      }

      actions.setSearchSettings({
        ...searchSettings,
        boosts: {
          ...boosts,
          [name]: updatedBoosts,
        },
      });
    },
    removeBoostValue: ({ name, boostIndex, valueIndex }) => {
      const { searchSettings } = values;
      const { boosts } = searchSettings;
      const updatedBoosts = cloneDeep(boosts[name]);
      const boostValue = updatedBoosts[boostIndex].value;

      if (boostValue === undefined) return;

      boostValue.splice(valueIndex, 1);
      actions.setSearchSettings({
        ...searchSettings,
        boosts: {
          ...boosts,
          [name]: updatedBoosts,
        },
      });
    },
    updateBoostSelectOption: ({ name, boostIndex, optionType, value }) => {
      const { searchSettings } = values;
      const { boosts } = searchSettings;
      const updatedBoosts = cloneDeep(boosts[name]);
      if (optionType === 'operation') {
        updatedBoosts[boostIndex][optionType] = value as BoostOperation;
      } else {
        updatedBoosts[boostIndex][optionType] = value as BoostFunction;
      }

      actions.setSearchSettings({
        ...searchSettings,
        boosts: {
          ...boosts,
          [name]: updatedBoosts,
        },
      });
    },
    updateSearchValue: (query) => {
      actions.setSearchQuery(query);
      actions.getSearchResults();
    },
  }),
});
