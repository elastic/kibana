/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea, MakeLogicType } from 'kea';
import { generatePath } from 'react-router-dom';

import { ENGINE_PATH } from '../../routes';
import { formatApiName } from '../../utils/format_api_name';
import { flashAPIErrors, setQueuedSuccessMessage } from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { KibanaLogic } from '../../../shared/kibana';

import { DEFAULT_LANGUAGE, ENGINE_CREATION_SUCCESS_MESSAGE } from './constants';

interface EngineCreationActions {
  onEngineCreationSuccess(): void;
  setLanguage(language: string): { language: string };
  setRawName(rawName: string): { rawName: string };
  submitEngine(): void;
}

interface EngineCreationValues {
  language: string;
  name: string;
  rawName: string;
}

export const EngineCreationLogic = kea<MakeLogicType<EngineCreationValues, EngineCreationActions>>({
  path: ['enterprise_search', 'app_search', 'engine_creation_logic'],
  actions: {
    onEngineCreationSuccess: true,
    setLanguage: (language) => ({ language }),
    setRawName: (rawName) => ({ rawName }),
    submitEngine: true,
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
  },
  selectors: ({ selectors }) => ({
    name: [() => [selectors.rawName], (rawName) => formatApiName(rawName)],
  }),
  listeners: ({ values, actions }) => ({
    submitEngine: async () => {
      const { http } = HttpLogic.values;
      const { name, language } = values;

      const body = JSON.stringify({ name, language });

      try {
        await http.post('/api/app_search/engines', { body });
        actions.onEngineCreationSuccess();
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    onEngineCreationSuccess: () => {
      const { name } = values;
      const { navigateToUrl } = KibanaLogic.values;
      const enginePath = generatePath(ENGINE_PATH, { engineName: name });

      setQueuedSuccessMessage(ENGINE_CREATION_SUCCESS_MESSAGE);
      navigateToUrl(enginePath);
    },
  }),
});
