/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { formatApiName } from '../../utils/format_api_name';

import { DEFAULT_LANGUAGE } from './constants';

export interface NewSearchIndexValues {
  language: string;
  name: string;
  rawName: string;
}

export interface NewSearchIndexActions {
  setLanguage(language: string): { language: string };
  setRawName(rawName: string): { rawName: string };
}

export const NewSearchIndexLogic = kea<MakeLogicType<NewSearchIndexValues, NewSearchIndexActions>>({
  actions: {
    setLanguage: (language) => ({ language }),
    setRawName: (rawName) => ({ rawName }),
  },
  path: ['enterprise_search', 'content', 'new_search_index'],
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
  },
  selectors: ({ selectors }) => ({
    name: [() => [selectors.rawName], (rawName) => formatApiName(rawName)],
  }),
});
