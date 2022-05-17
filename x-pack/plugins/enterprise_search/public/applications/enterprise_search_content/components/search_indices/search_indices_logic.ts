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
  initPage(): void;
  loadSearchEngines(): void;
  searchEnginesLoadSuccess(searchEngines: Engine[]): Engine[]; // TODO proper types when backend ready
  loadSearchIndices(): void;
  searchIndicesLoadSuccess(searchIndices: SearchIndex[]): SearchIndex[]; // TODO proper types when backend ready
}

export const SearchIndicesLogic = kea<MakeLogicType<SearchIndicesValues, SearchIndicesActions>>({
  path: ['enterprise_search', 'content', 'search_indices'],
  actions: {
    initPage: true,
    loadSearchIndices: true,
    searchIndicesLoadSuccess: (searchIndices) => searchIndices,
    loadSearchEngines: true,
    searchEnginesLoadSuccess: (searchEngines) => searchEngines,
  },
  reducers: {
    searchIndices: [
      [],
      {
        searchIndicesLoadSuccess: (_, searchIndices) => searchIndices,
      },
    ],
    searchEngines: [
      [],
      {
        searchEnginesLoadSuccess: (_, searchEngines) => searchEngines,
      },
    ],
  },
  listeners: ({ actions }) => ({
    initPage: async () => {
      actions.loadSearchEngines();
      actions.loadSearchIndices();
    },
    loadSearchEngines: async () => {
      try {
        // TODO replace with actual backend call, add test cases
        const response = await Promise.resolve(searchEnginesMock);
        actions.searchEnginesLoadSuccess(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    loadSearchIndices: async () => {
      try {
        // TODO replace with actual backend call, add test cases
        const response = await Promise.resolve(searchIndicesMock);
        actions.searchIndicesLoadSuccess(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
