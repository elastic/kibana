/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import type { EuiComboBoxOptionOption } from '@elastic/eui';

import { Engine } from '../../../app_search/components/engine/types';
import { formatApiName } from '../../utils/format_api_name';

import { SearchIndicesLogic, SearchIndicesValues } from '../search_indices/search_indices_logic';

import { DEFAULT_LANGUAGE } from './constants';
import { ISearchEngineOption } from './new_search_index_template';

export interface NewSearchIndexValues extends Pick<SearchIndicesValues, 'searchEngines'> {
  searchEngineSelectOptions: ISearchEngineOption[];
  rawName: string;
  name: string;
  language: string;
  selectedSearchEngines: Array<EuiComboBoxOptionOption<Engine>>;
  shouldCreateAlias: boolean;
}

export interface NewSearchIndexActions {
  setRawName(rawName: string): { rawName: string };
  setLanguage(language: string): { language: string };
  setSelectedSearchEngineOptions(selectedSearchEngines: Array<EuiComboBoxOptionOption<Engine>>): {
    selectedSearchEngines: Array<EuiComboBoxOptionOption<Engine>>;
  };
  toggleCreateAlias(): void;
}

export const NewSearchIndexLogic = kea<MakeLogicType<NewSearchIndexValues, NewSearchIndexActions>>({
  path: ['enterprise_search', 'content', 'new_search_index'],
  connect: {
    values: [SearchIndicesLogic, ['searchEngines']],
  },
  actions: {
    setRawName: (rawName) => ({ rawName }),
    setLanguage: (language) => ({ language }),
    setSelectedSearchEngineOptions: (selectedSearchEngines) => ({
      selectedSearchEngines,
    }),
    toggleCreateAlias: () => true,
  },
  reducers: {
    language: [
      DEFAULT_LANGUAGE,
      {
        setLanguage: (_, { language }) => language,
      },
    ],
    rawName: [
      '',
      {
        setRawName: (_, { rawName }) => rawName,
      },
    ],
    selectedSearchEngines: [
      [],
      {
        setSelectedSearchEngineOptions: (_, { selectedSearchEngines }) => selectedSearchEngines,
      },
    ],
    shouldCreateAlias: [
      true,
      {
        toggleCreateAlias: (shouldCreateAlias) => !shouldCreateAlias,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    name: [() => [selectors.rawName], (rawName) => formatApiName(rawName)],
    searchEngineSelectOptions: [
      () => [selectors.searchEngines],
      (searchEngines) =>
        searchEngines.map((s: Engine) => ({
          label: s.name,
          value: s,
        })),
    ],
  }),
});
