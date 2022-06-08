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
import { IndicesLogic, IndicesValues } from '../indices/indices_logic';

import { DEFAULT_LANGUAGE } from './constants';
import { ISearchEngineOption } from './new_index_template';

export interface NewIndexValues extends Pick<IndicesValues, 'searchEngines'> {
  searchEngineSelectOptions: ISearchEngineOption[];
  rawName: string;
  name: string;
  language: string;
  selectedSearchEngines: Array<EuiComboBoxOptionOption<Engine>>;
}

export interface NewIndexActions {
  setRawName(rawName: string): { rawName: string };
  setLanguage(language: string): { language: string };
  setSelectedSearchEngineOptions(selectedSearchEngines: Array<EuiComboBoxOptionOption<Engine>>): {
    selectedSearchEngines: Array<EuiComboBoxOptionOption<Engine>>;
  };
}

export const NewIndexLogic = kea<MakeLogicType<NewIndexValues, NewIndexActions>>({
  path: ['enterprise_search', 'content', 'new_index'],
  connect: {
    values: [IndicesLogic, ['searchEngines']],
  },
  actions: {
    setRawName: (rawName) => ({ rawName }),
    setLanguage: (language) => ({ language }),
    setSelectedSearchEngineOptions: (selectedSearchEngines) => ({
      selectedSearchEngines,
    }),
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
