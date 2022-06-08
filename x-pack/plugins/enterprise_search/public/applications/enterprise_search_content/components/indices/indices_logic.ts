/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  indices as indicesMock,
  searchEngines as searchEnginesMock,
} from '../../__mocks__';

import { kea, MakeLogicType } from 'kea';

import { Engine } from '../../../app_search/components/engine/types';
import { flashAPIErrors } from '../../../shared/flash_messages';
import { IIndex } from '../../types';

export interface IndicesValues {
  indices: IIndex[];
  searchEngines: Engine[];
}

export interface IndicesActions {
  initPage(): void;
  loadSearchEngines(): void;
  searchEnginesLoadSuccess(searchEngines: Engine[]): Engine[]; // TODO proper types when backend ready
  loadIndices(): void;
  indicesLoadSuccess(searchIndices: IIndex[]): IIndex[]; // TODO proper types when backend ready
}

export const IndicesLogic = kea<MakeLogicType<IndicesValues, IndicesActions>>({
  path: ['enterprise_search', 'content', 'search_indices'],
  actions: {
    initPage: true,
    loadIndices: true,
    indicesLoadSuccess: (searchIndices) => searchIndices,
    loadSearchEngines: true,
    searchEnginesLoadSuccess: (searchEngines) => searchEngines,
  },
  reducers: {
    indices: [
      [],
      {
        indicesLoadSuccess: (_, searchIndices) => searchIndices,
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
      actions.loadIndices();
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
    loadIndices: async () => {
      try {
        // TODO replace with actual backend call, add test cases
        const response = await Promise.resolve(indicesMock);
        actions.indicesLoadSuccess(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
