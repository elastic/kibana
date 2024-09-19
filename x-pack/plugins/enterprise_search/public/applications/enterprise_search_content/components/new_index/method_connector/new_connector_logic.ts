/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Actions } from '../../../../shared/api_logic/create_api_logic';
import {
  AddConnectorApiLogic,
  AddConnectorApiLogicArgs,
  AddConnectorApiLogicResponse,
} from '../../../api/connector/add_connector_api_logic';

import {
  GenerateConnectorNamesApiLogic,
  GenerateConnectorNamesApiLogicActions,
} from '../../../api/connector/generate_connector_names_api_logic';
import {
  IndexExistsApiLogic,
  IndexExistsApiParams,
  IndexExistsApiResponse,
} from '../../../api/index/index_exists_api_logic';

import { isValidIndexName } from '../../../utils/validate_index_name';

import { UNIVERSAL_LANGUAGE_VALUE } from '../constants';
import { LanguageForOptimization } from '../types';
import { getLanguageForOptimization } from '../utils';

export interface NewConnectorValues {
  data: IndexExistsApiResponse;
  fullIndexName: string;
  fullIndexNameExists: boolean;
  fullIndexNameIsValid: boolean;
  generatedName: string;
  language: LanguageForOptimization;
  languageSelectValue: string;
  rawName: string;
}

type NewConnectorActions = Pick<
  Actions<IndexExistsApiParams, IndexExistsApiResponse>,
  'makeRequest'
> & {
  conncetorNameGenerated: GenerateConnectorNamesApiLogicActions['apiSuccess'];
  generateConnectorName: GenerateConnectorNamesApiLogicActions['makeRequest'];
} & {
  connectorCreated: Actions<AddConnectorApiLogicArgs, AddConnectorApiLogicResponse>['apiSuccess'];
  setGeneratedName(name: string): { name: string };
  setLanguageSelectValue(language: string): { language: string };
  setRawName(rawName: string): { rawName: string };
};

export const NewConnectorLogic = kea<MakeLogicType<NewConnectorValues, NewConnectorActions>>({
  actions: {
    setGeneratedName: (name) => ({ name }),
    setLanguageSelectValue: (language) => ({ language }),
    setRawName: (rawName) => ({ rawName }),
  },
  connect: {
    actions: [
      GenerateConnectorNamesApiLogic,
      ['makeRequest as generateConnectorName', 'apiSuccess as connectorNameGenerated'],
      AddConnectorApiLogic,
      ['apiSuccess as connectorCreated'],
      IndexExistsApiLogic,
      ['makeRequest'],
    ],
    values: [IndexExistsApiLogic, ['data']],
  },
  listeners: ({ actions }) => ({
    connectorNameGenerated: ({ connectorName }) => {
      actions.setGeneratedName(connectorName);
    },
  }),
  path: ['enterprise_search', 'content', 'new_search_index'],
  reducers: {
    generatedName: [
      '',
      {
        setGeneratedName: (_: NewConnectorValues['generatedName'], { name }: { name: string }) =>
          name,
        setRawName: () => '',
      },
    ],
    languageSelectValue: [
      UNIVERSAL_LANGUAGE_VALUE,
      {
        // @ts-expect-error upgrade typescript v5.1.6
        setLanguageSelectValue: (_, { language }) => language ?? null,
      },
    ],
    rawName: [
      '',
      {
        // @ts-expect-error upgrade typescript v5.1.6
        setRawName: (_, { rawName }) => rawName,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    fullIndexName: [
      () => [selectors.rawName, selectors.generatedName],
      (name: string, generatedName: string) => (name ? name : generatedName),
    ],
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
