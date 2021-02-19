/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generatePath } from 'react-router-dom';

import { kea, MakeLogicType } from 'kea';

import { Meta } from '../../../../../common/types';
import { flashAPIErrors, setQueuedSuccessMessage } from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { KibanaLogic } from '../../../shared/kibana';
import { ENGINE_PATH } from '../../routes';
import { formatApiName } from '../../utils/format_api_name';
import { EngineDetails } from '../engine/types';

import { META_ENGINE_CREATION_SUCCESS_MESSAGE } from './constants';

interface MetaEngineCreationValues {
  indexedEngineNames: string[];
  name: string;
  rawName: string;
  selectedIndexedEngineNames: string[];
}

interface MetaEngineCreationActions {
  fetchIndexedEngineNames(page?: number): { page: number };
  onEngineCreationSuccess(): void;
  setIndexedEngineNames(
    indexedEngineNames: MetaEngineCreationValues['indexedEngineNames']
  ): { indexedEngineNames: MetaEngineCreationValues['indexedEngineNames'] };
  setRawName(rawName: string): { rawName: string };
  setSelectedIndexedEngineNames(
    selectedIndexedEngineNames: MetaEngineCreationValues['selectedIndexedEngineNames']
  ): { selectedIndexedEngineNames: MetaEngineCreationValues['selectedIndexedEngineNames'] };
  submitEngine(): void;
}

export const MetaEngineCreationLogic = kea<
  MakeLogicType<MetaEngineCreationValues, MetaEngineCreationActions>
>({
  path: ['enterprise_search', 'app_search', 'meta_engine_creation_logic'],
  actions: {
    fetchIndexedEngineNames: (page = 1) => ({ page }),
    onEngineCreationSuccess: true,
    setIndexedEngineNames: (indexedEngineNames) => ({ indexedEngineNames }),
    setRawName: (rawName) => ({ rawName }),
    setSelectedIndexedEngineNames: (selectedIndexedEngineNames) => ({ selectedIndexedEngineNames }),
    submitEngine: () => null,
  },
  reducers: {
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
      let response;

      try {
        response = (await http.get('/api/app_search/engines', {
          query: { type: 'indexed', pageIndex: page },
        })) as { results: EngineDetails[]; meta: Meta };
      } catch (e) {
        flashAPIErrors(e);
      }

      if (response) {
        const engineNames = response.results.map((result) => result.name);
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

      setQueuedSuccessMessage(META_ENGINE_CREATION_SUCCESS_MESSAGE);
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

      let response;
      try {
        response = await http.post('/api/app_search/engines', { body });
      } catch (e) {
        flashAPIErrors(e);
      }

      if (response) {
        actions.onEngineCreationSuccess();
      }
    },
  }),
});
