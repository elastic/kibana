/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { ElasticsearchIndex } from '../../../../../common/types';
import { flashAPIErrors, flashSuccessToast } from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { KibanaLogic } from '../../../shared/kibana';
import { formatApiName } from '../../utils/format_api_name';

import { DEFAULT_LANGUAGE, ENGINE_CREATION_SUCCESS_MESSAGE } from './constants';
import { SearchIndexSelectableOption } from './search_index_selectable';
import { getRedirectToAfterEngineCreation, formatIndicesToSelectable } from './utils';

type EngineType = 'appSearch' | 'elasticsearch';
interface EngineCreationActions {
  onEngineCreationSuccess(): void;
  setIngestionMethod(method: string): { method: string };
  setLanguage(language: string): { language: string };
  setRawName(rawName: string): { rawName: string };
  submitEngine(): void;
  onSubmitError(): void;
  loadIndices(): void;
  onLoadIndicesSuccess(indices: ElasticsearchIndex[]): { indices: ElasticsearchIndex[] };
  setSelectedIndex(selectedIndexName: string): { selectedIndexName: string };
  setEngineType(engineType: EngineType): { engineType: EngineType };
}

interface EngineCreationValues {
  ingestionMethod: string;
  isLoading: boolean;
  language: string;
  name: string;
  rawName: string;
  isLoadingIndices: boolean;
  indices: ElasticsearchIndex[];
  indicesFormatted: SearchIndexSelectableOption[];
  selectedIndex: string;
  engineType: EngineType;
  isSubmitDisabled: boolean;
}

export const EngineCreationLogic = kea<MakeLogicType<EngineCreationValues, EngineCreationActions>>({
  path: ['enterprise_search', 'app_search', 'engine_creation_logic'],
  actions: {
    onEngineCreationSuccess: true,
    setIngestionMethod: (method) => ({ method }),
    setLanguage: (language) => ({ language }),
    setRawName: (rawName) => ({ rawName }),
    submitEngine: true,
    onSubmitError: true,
    loadIndices: true,
    onLoadIndicesSuccess: (indices) => ({ indices }),
    setSelectedIndex: (selectedIndexName) => ({ selectedIndexName }),
    setEngineType: (engineType) => ({ engineType }),
  },
  reducers: {
    ingestionMethod: [
      '',
      {
        setIngestionMethod: (_, { method }) => method,
      },
    ],
    isLoading: [
      false,
      {
        submitEngine: () => true,
        onSubmitError: () => false,
      },
    ],
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
    isLoadingIndices: [
      false,
      {
        loadIndices: () => true,
        onLoadIndicesSuccess: () => false,
        onSubmitError: () => false,
      },
    ],
    indices: [
      [],
      {
        onLoadIndicesSuccess: (_, { indices }) => indices,
      },
    ],
    selectedIndex: [
      '',
      {
        setSelectedIndex: (_, { selectedIndexName }) => selectedIndexName,
        onSubmitError: () => '',
      },
    ],
    engineType: [
      'appSearch',
      {
        setEngineType: (_, { engineType }) => engineType,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    name: [() => [selectors.rawName], (rawName) => formatApiName(rawName)],
    indicesFormatted: [
      () => [selectors.indices, selectors.selectedIndex],
      (indices: ElasticsearchIndex[], selectedIndexName) =>
        formatIndicesToSelectable(indices, selectedIndexName),
    ],
    isSubmitDisabled: [
      () => [selectors.name, selectors.engineType, selectors.selectedIndex],
      (name: string, engineType: EngineType, selectedIndex: string) =>
        (name.length === 0 && engineType === 'appSearch') ||
        ((name.length === 0 || selectedIndex.length === 0) && engineType === 'elasticsearch'),
    ],
  }),
  listeners: ({ values, actions }) => ({
    submitEngine: async () => {
      const { http } = HttpLogic.values;
      const { name, language } = values;

      const body = JSON.stringify({ name, language });

      try {
        await http.post('/internal/app_search/engines', { body });
        actions.onEngineCreationSuccess();
      } catch (e) {
        flashAPIErrors(e);
        actions.onSubmitError();
      }
    },
    onEngineCreationSuccess: () => {
      const { ingestionMethod, name } = values;
      const { navigateToUrl } = KibanaLogic.values;
      const toUrl = getRedirectToAfterEngineCreation({ ingestionMethod, engineName: name });

      flashSuccessToast(ENGINE_CREATION_SUCCESS_MESSAGE(name));
      navigateToUrl(toUrl);
    },
    loadIndices: async () => {
      const { http } = HttpLogic.values;
      try {
        const indices = await http.get('/internal/enterprise_search/indices');
        actions.onLoadIndicesSuccess(indices as ElasticsearchIndex[]);
      } catch (e) {
        flashAPIErrors(e);
        actions.onSubmitError();
      }
    },
  }),
});
