/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Status } from '../../../../../../../common/types/api';

import { GenerateEngineApiKeyLogic } from '../../../../api/generate_engine_api_key/generate_engine_api_key_logic';

interface GenerateApiKeyModalActions {
  setKeyName(keyName: string): { keyName: string };
}

interface GenerateApiKeyModalValues {
  apiKey: string;
  data: typeof GenerateEngineApiKeyLogic.values.data;
  isLoading: boolean;
  isSuccess: boolean;
  keyName: string;
  status: typeof GenerateEngineApiKeyLogic.values.status;
}

export const GenerateApiKeyModalLogic = kea<
  MakeLogicType<GenerateApiKeyModalValues, GenerateApiKeyModalActions>
>({
  actions: {
    setKeyName: (keyName) => ({ keyName }),
  },
  connect: {
    values: [GenerateEngineApiKeyLogic, ['data', 'status']],
  },
  path: ['enterprise_search', 'engines', 'api', 'generate_api_key_modal'],
  reducers: () => ({
    keyName: [
      '',
      {
        setKeyName: (_, { keyName }) => keyName,
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    apiKey: [() => [selectors.data], (data) => data?.apiKey?.encoded || ''],
    isLoading: [() => [selectors.status], (status) => status === Status.LOADING],
    isSuccess: [() => [selectors.status], (status) => status === Status.SUCCESS],
  }),
});
