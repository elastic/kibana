/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { flashAPIErrors } from '../../../shared/flash_messages';

import { mockedEngines } from './_mocks_/mocked_engines';
import { EngineListDetails, EnginesListAPIResponse } from './types';

interface EngineListValues {
  engines: EngineListDetails[];
}

interface EnginesListActions {
  onEnginesPagination(page: number): { page: number };
  onEnginesLoad({ results, meta }: EnginesListAPIResponse): EnginesListAPIResponse;
  loadEngines(): void;
}

export const EnginesListLogic = kea<MakeLogicType<EngineListValues, EnginesListActions>>({
  path: ['enterprise_search', 'engines_logic'],
  actions: {
    onEnginesLoad: ({ results, meta }) => ({ results, meta }),
    loadEngines: true,
  },
  reducers: {
    engines: [
      [],
      {
        onEnginesLoad: (_, { results }) => results,
      },
    ],
  },
  selectors: {},
  listeners: ({ actions }) => ({
    loadEngines: () => {
      // TODO: Remove this with Backend API call
      try {
        const response = {
          meta: {
            page: {
              current: 1,
              size: 10,
              total_pages: 1,
              total_results: 2,
            },
          },
          results: mockedEngines,
        };

        actions.onEnginesLoad(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
