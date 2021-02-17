/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Meta } from '../../../../../common/types';
import { flashAPIErrors } from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { formatApiName } from '../../utils/format_api_name';
import { EngineDetails } from '../engine/types';

interface MetaEngineCreationValues {
  indexedEngineNames: string[];
  name: string;
  rawName: string;
  selectedIndexedEngineNames: string[];
}

interface MetaEngineCreationActions {
  fetchIndexedEngineNames(page?: number): { page: number };
  setIndexedEngineNames(
    indexedEngineNames: MetaEngineCreationValues['indexedEngineNames']
  ): { indexedEngineNames: MetaEngineCreationValues['indexedEngineNames'] };
  setRawName(rawName: string): { rawName: string };
  setSelectedIndexedEngineNames(
    selectedIndexedEngineNames: MetaEngineCreationValues['selectedIndexedEngineNames']
  ): { selectedIndexedEngineNames: MetaEngineCreationValues['selectedIndexedEngineNames'] };
}

export const MetaEngineCreationLogic = kea<
  MakeLogicType<MetaEngineCreationValues, MetaEngineCreationActions>
>({
  path: ['enterprise_search', 'app_search', 'meta_engine_creation_logic'],
  actions: {
    fetchIndexedEngineNames: (page = 1) => ({ page }),
    setIndexedEngineNames: (indexedEngineNames) => ({ indexedEngineNames }),
    setRawName: (rawName) => ({ rawName }),
    setSelectedIndexedEngineNames: (selectedIndexedEngineNames) => ({ selectedIndexedEngineNames }),
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
  }),
});
