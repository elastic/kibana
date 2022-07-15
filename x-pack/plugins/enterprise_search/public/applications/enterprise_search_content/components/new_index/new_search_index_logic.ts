/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { formatApiName } from '../../utils/format_api_name';

import { UNIVERSAL_LANGUAGE_VALUE } from './constants';
import { LanguageForOptimization } from './types';
import { getLanguageForOptimizatioin } from './utils';

export interface NewSearchIndexValues {
  language: LanguageForOptimization;
  languageSelectValue: string;
  name: string;
  rawName: string;
}

export interface NewSearchIndexActions {
  setLanguageSelectValue(language: string): { language: string };
  setRawName(rawName: string): { rawName: string };
}

export const NewSearchIndexLogic = kea<MakeLogicType<NewSearchIndexValues, NewSearchIndexActions>>({
  actions: {
    setLanguageSelectValue: (language) => ({ language }),
    setRawName: (rawName) => ({ rawName }),
  },
  path: ['enterprise_search', 'content', 'new_search_index'],
  reducers: {
    languageSelectValue: [
      UNIVERSAL_LANGUAGE_VALUE,
      {
        setLanguageSelectValue: (_, { language }) => language ?? null,
      },
    ],
    rawName: [
      '',
      {
        setRawName: (_, { rawName }) => rawName,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    language: [
      () => [selectors.languageSelectValue],
      (languageSelectValue) => getLanguageForOptimizatioin(languageSelectValue),
    ],
    name: [() => [selectors.rawName], (rawName) => formatApiName(rawName)],
  }),
});
