/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  searchIndices as searchIndicesMock,
  searchEngines as searchEnginesMock,
} from '../../__mocks__';

import { kea, MakeLogicType } from 'kea';

import { Engine } from '../../../app_search/components/engine/types';
import { flashAPIErrors } from '../../../shared/flash_messages';
import { SearchIndex } from '../../types';

export interface SearchIndicesValues {
  searchIndices: SearchIndex[];
  searchEngines: Engine[];
}

export interface SearchIndicesActions {
  loadSearchEngines(): void;
  onSearchEnginesLoad(searchEngines: Engine[]): Engine[]; // TODO proper types when backend ready
  loadSearchIndices(): void;
  onSearchIndicesLoad(searchIndices: SearchIndex[]): SearchIndex[]; // TODO proper types when backend ready
}

export const SearchIndicesLogic = kea<MakeLogicType<SearchIndicesValues, SearchIndicesActions>>({
  path: ['enterprise_search', 'content', 'search_indices', 'search_indices_logic'],
  actions: {
    loadSearchIndices: true,
    onSearchIndicesLoad: (searchIndices) => searchIndices,
    loadSearchEngines: true,
    onSearchEnginesLoad: (searchEngines) => searchEngines,
  },
  reducers: {
    searchIndices: [
      [],
      {
        onSearchIndicesLoad: (_, searchIndices) => searchIndices,
      },
    ],
    searchEngines: [
      [],
      {
        onSearchEnginesLoad: (_, searchEngines) => searchEngines,
      },
    ],
  },
  listeners: ({ actions }) => ({
    loadSearchEngines: async () => {
      try {
        // TODO replace with actual backend call
        const response = await Promise.resolve(searchEnginesMock);
        actions.onSearchEnginesLoad(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    loadSearchIndices: async () => {
      try {
        // TODO replace with actual backend call
        const response = await Promise.resolve(searchIndicesMock);
        actions.onSearchIndicesLoad(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
