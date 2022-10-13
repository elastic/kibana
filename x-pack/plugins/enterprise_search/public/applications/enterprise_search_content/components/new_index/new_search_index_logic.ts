/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Actions } from '../../../shared/api_logic/create_api_logic';
import {
  AddConnectorApiLogic,
  AddConnectorApiLogicArgs,
  AddConnectorApiLogicResponse,
} from '../../api/connector/add_connector_api_logic';
import {
  CreateCrawlerIndexApiLogic,
  CreateCrawlerIndexArgs,
  CreateCrawlerIndexResponse,
} from '../../api/crawler/create_crawler_index_api_logic';
import {
  CreateApiIndexApiLogic,
  CreateApiIndexApiLogicArgs,
  CreateApiIndexApiLogicResponse,
} from '../../api/index/create_api_index_api_logic';

import {
  IndexExistsApiLogic,
  IndexExistsApiParams,
  IndexExistsApiResponse,
} from '../../api/index/index_exists_api_logic';

import { isValidIndexName } from '../../utils/validate_index_name';

import { UNIVERSAL_LANGUAGE_VALUE } from './constants';
import { flashIndexCreatedToast } from './new_index_created_toast';
import { LanguageForOptimization } from './types';
import { getLanguageForOptimization } from './utils';

export interface NewSearchIndexValues {
  data: IndexExistsApiResponse;
  fullIndexName: string;
  fullIndexNameExists: boolean;
  fullIndexNameIsValid: boolean;
  language: LanguageForOptimization;
  languageSelectValue: string;
  rawName: string;
}

type NewSearchIndexActions = Pick<
  Actions<IndexExistsApiParams, IndexExistsApiResponse>,
  'makeRequest'
> & {
  apiIndexCreated: Actions<
    CreateApiIndexApiLogicArgs,
    CreateApiIndexApiLogicResponse
  >['apiSuccess'];
  connectorIndexCreated: Actions<
    AddConnectorApiLogicArgs,
    AddConnectorApiLogicResponse
  >['apiSuccess'];
  crawlerIndexCreated: Actions<CreateCrawlerIndexArgs, CreateCrawlerIndexResponse>['apiSuccess'];
  setLanguageSelectValue(language: string): { language: string };
  setRawName(rawName: string): { rawName: string };
};

export const NewSearchIndexLogic = kea<MakeLogicType<NewSearchIndexValues, NewSearchIndexActions>>({
  actions: {
    setLanguageSelectValue: (language) => ({ language }),
    setRawName: (rawName) => ({ rawName }),
  },
  connect: {
    actions: [
      AddConnectorApiLogic,
      ['apiSuccess as connectorIndexCreated'],
      CreateApiIndexApiLogic,
      ['apiSuccess as apiIndexCreated'],
      CreateCrawlerIndexApiLogic,
      ['apiSuccess as crawlerIndexCreated'],
      IndexExistsApiLogic,
      ['makeRequest'],
    ],
    values: [IndexExistsApiLogic, ['data']],
  },
  listeners: ({ actions, values }) => ({
    apiIndexCreated: () => {
      flashIndexCreatedToast();
    },
    connectorIndexCreated: () => {
      flashIndexCreatedToast();
    },
    crawlerIndexCreated: () => {
      flashIndexCreatedToast();
    },
    setRawName: async (_, breakpoint) => {
      await breakpoint(150);
      actions.makeRequest({ indexName: values.fullIndexName });
    },
  }),
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
    fullIndexName: [() => [selectors.rawName], (name: string) => `search-${name}`],
    fullIndexNameExists: [
      () => [selectors.data, selectors.fullIndexName],
      (data: IndexExistsApiResponse | undefined, fullIndexName: string) =>
        data?.exists === true && data.indexName === fullIndexName,
    ],
    fullIndexNameIsValid: [
      () => [selectors.fullIndexName],
      (fullIndexName) => isValidIndexName(fullIndexName),
    ],
    language: [
      () => [selectors.languageSelectValue],
      (languageSelectValue) => getLanguageForOptimization(languageSelectValue),
    ],
  }),
});
