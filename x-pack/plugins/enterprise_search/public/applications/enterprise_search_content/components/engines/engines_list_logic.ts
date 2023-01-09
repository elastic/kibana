/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Actions } from '../../../shared/api_logic/create_api_logic';

import { flashAPIErrors } from '../../../shared/flash_messages';

import {
  EnginesListAPIArguments,
  EnginesListAPIResponse,
  FetchEnginesAPILogic,
} from '../../api/engines/fetch_engines_api_logic';

import { DEFAULT_META, EngineListDetails, Meta, updateMetaPageIndex } from './types';

type EnginesListActions = Pick<
  Actions<EnginesListAPIArguments, EnginesListAPIResponse>,
  'apiError' | 'apiSuccess' | 'makeRequest'
> & {
  fetchEngines({ meta, searchQuery }: { meta: Meta; searchQuery?: string }): {
    meta: Meta;
    searchQuery?: string;
  };
  onPaginate(pageNumber: number): { pageNumber: number };
};
interface EngineListValues {
  data: typeof FetchEnginesAPILogic.values.data;
  meta: Meta;
  results: EngineListDetails[]; // stores engine list value from data
  parameters: { meta: Meta; searchQuery?: string }; // Added this variable to store to the search Query value as well
  status: typeof FetchEnginesAPILogic.values.status;
}

export const EnginesListLogic = kea<MakeLogicType<EngineListValues, EnginesListActions>>({
  connect: {
    actions: [FetchEnginesAPILogic, ['makeRequest', 'apiSuccess', 'apiError']],
    values: [FetchEnginesAPILogic, ['data', 'status']],
  },
  path: ['enterprise_search', 'content', 'engine_list_logic'],
  actions: {
    fetchEngines: ({ meta, searchQuery }) => ({
      meta,
      searchQuery,
    }),

    onPaginate: (pageNumber) => ({ pageNumber }),
  },
  reducers: ({}) => ({
    parameters: [
      { meta: DEFAULT_META },
      {
        apiSuccess: (_, { meta, searchQuery }) => ({
          meta,
          searchQuery,
        }),
        onPaginate: (state, { pageNumber }) => ({
          ...state,
          meta: updateMetaPageIndex(state.meta, pageNumber),
        }),
      },
    ],
  }),

  selectors: ({ selectors }) => ({
    results: [() => [selectors.data], (data) => data?.results ?? []],
    meta: [() => [selectors.parameters], (parameters) => parameters.meta],
  }),
  listeners: ({ actions }) => ({
    apiError: (e) => {
      flashAPIErrors(e);
    },
    fetchEngines: async (input) => {
      actions.makeRequest(input);
    },
  }),
});
