/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generatePath } from 'react-router-dom';

import { kea, MakeLogicType } from 'kea';

import { Meta } from '../../../../../common/types';
import { DEFAULT_META } from '../../../shared/constants';
import { flashAPIErrors, flashSuccessToast } from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { KibanaLogic } from '../../../shared/kibana';
import { ENGINE_PATH } from '../../routes';
import { formatApiName } from '../../utils/format_api_name';
import { EngineDetails, EngineTypes } from '../engine/types';

import { META_ENGINE_CREATION_SUCCESS_MESSAGE } from './constants';

interface MetaEngineCreationValues {
  indexedEngineNames: string[];
  name: string;
  rawName: string;
  selectedIndexedEngineNames: string[];
  isLoading: boolean;
}

interface MetaEngineCreationActions {
  fetchIndexedEngineNames(page?: number): { page: number };
  onEngineCreationSuccess(): void;
  setIndexedEngineNames(indexedEngineNames: MetaEngineCreationValues['indexedEngineNames']): {
    indexedEngineNames: MetaEngineCreationValues['indexedEngineNames'];
  };
  setRawName(rawName: string): { rawName: string };
  setSelectedIndexedEngineNames(
    selectedIndexedEngineNames: MetaEngineCreationValues['selectedIndexedEngineNames']
  ): { selectedIndexedEngineNames: MetaEngineCreationValues['selectedIndexedEngineNames'] };
  submitEngine(): void;
  onSubmitError(): void;
}

export const MetaEngineCreationLogic = kea<
  MakeLogicType<MetaEngineCreationValues, MetaEngineCreationActions>
>({
  path: ['enterprise_search', 'app_search', 'meta_engine_creation_logic'],
  actions: {
    fetchIndexedEngineNames: (page = DEFAULT_META.page.current) => ({ page }),
    onEngineCreationSuccess: true,
    setIndexedEngineNames: (indexedEngineNames) => ({ indexedEngineNames }),
    setRawName: (rawName) => ({ rawName }),
    setSelectedIndexedEngineNames: (selectedIndexedEngineNames) => ({ selectedIndexedEngineNames }),
    submitEngine: true,
    onSubmitError: true,
  },
  reducers: {
    isLoading: [
      false,
      {
        submitEngine: () => true,
        onSubmitError: () => false,
      },
    ],
    indexedEngineNames: [
      [],
      {
        setIndexedEngineNames: (_, { indexedEngineNames }) => indexedEngineNames,
      },
    ],
    rawName: [
      '',
      {
        setRawName: (_, { rawName }) => rawName,
      },
    ],
    selectedIndexedEngineNames: [
      [],
      {
        setSelectedIndexedEngineNames: (_, { selectedIndexedEngineNames }) =>
          selectedIndexedEngineNames,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    name: [() => [selectors.rawName], (rawName: string) => formatApiName(rawName)],
  }),
  listeners: ({ values, actions }) => ({
    fetchIndexedEngineNames: async ({ page }) => {
      const { http } = HttpLogic.values;
      let response: { results: EngineDetails[]; meta: Meta } | undefined;

      try {
        response = await http.get('/internal/app_search/engines', {
          query: { type: 'indexed', 'page[current]': page, 'page[size]': DEFAULT_META.page.size },
        });
      } catch (e) {
        flashAPIErrors(e);
      }

      if (response) {
        const engineNames = response.results
          .filter(({ type }) => type !== EngineTypes.elasticsearch)
          .map((result) => result.name);
        actions.setIndexedEngineNames([...values.indexedEngineNames, ...engineNames]);

        if (page < response.meta.page.total_pages) {
          actions.fetchIndexedEngineNames(page + 1);
        }
      }
    },
    onEngineCreationSuccess: () => {
      const { name } = values;
      const { navigateToUrl } = KibanaLogic.values;
      const enginePath = generatePath(ENGINE_PATH, { engineName: name });

      flashSuccessToast(META_ENGINE_CREATION_SUCCESS_MESSAGE(name));
      navigateToUrl(enginePath);
    },
    submitEngine: async () => {
      const { http } = HttpLogic.values;
      const { name, selectedIndexedEngineNames } = values;

      const body = JSON.stringify({
        name,
        type: 'meta',
        source_engines: selectedIndexedEngineNames,
      });

      try {
        await http.post('/internal/app_search/engines', { body });
        actions.onEngineCreationSuccess();
      } catch (e) {
        flashAPIErrors(e);
        actions.onSubmitError();
      }
    },
  }),
});
