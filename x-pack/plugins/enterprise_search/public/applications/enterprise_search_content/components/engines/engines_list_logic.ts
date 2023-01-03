/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { HttpError } from '../../../../../common/types/api';

import { flashAPIErrors } from '../../../shared/flash_messages';

import { FetchEnginesAPILogic } from '../../api/engines/fetch_engines_api_logic';

import { DEFAULT_META, EngineListDetails, Meta, updateMetaPageIndex } from './types';

export interface EnginesListActions {
  apiError(error: HttpError): HttpError;
  apiSuccess({ enginesList, meta }: { enginesList: EngineListDetails[]; meta: Meta }): {
    enginesList: EngineListDetails[];
    meta: Meta;
  };
  fetchEngines({ meta }: { meta: Meta }): { meta: Meta };
  makeRequest: typeof FetchEnginesAPILogic.actions.makeRequest;
  onPaginate(pageNumber: number): { pageNumber: number };
}
export interface EngineListValues {
  data: typeof FetchEnginesAPILogic.values.data;
  enginesList: EngineListDetails[];
  meta: Meta;
  parameters: { meta: Meta }; // Added this variable to store to the search Query value as well
  status: typeof FetchEnginesAPILogic.values.status;
}

export const EnginesListLogic = kea<MakeLogicType<EngineListValues, EnginesListActions>>({
  connect: {
    actions: [FetchEnginesAPILogic, ['makeRequest', 'apiSuccess', 'apiError']],
    values: [FetchEnginesAPILogic, ['data', 'status']],
  },
  path: ['enterprise_search', 'content', 'engine_list_logic'],
  actions: {
    fetchEngines: ({ meta }) => ({
      meta,
    }),

    onPaginate: (pageNumber) => ({ pageNumber }),
  },
  reducers: ({}) => ({
    parameters: [
      { meta: DEFAULT_META },
      {
        apiSuccess: (_, { meta }) => ({
          meta,
        }),
        onPaginate: (state, { pageNumber }) => ({
          ...state,
          meta: updateMetaPageIndex(state.meta, pageNumber),
        }),
      },
    ],
  }),

  selectors: ({ selectors }) => ({
    enginesList: [() => [selectors.data], (data) => (data?.results ? data.results : [])],
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
