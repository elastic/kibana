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

import { EngineListDetails, Meta } from './types';

export interface EnginesListActions {
  apiError(error: HttpError): HttpError;
  apiSuccess({ enginesList, meta }: { enginesList: EngineListDetails[]; meta: Meta }): {
    enginesList: EngineListDetails[];
    meta: Meta;
  };
  fetchEngines({ meta }: { meta: Meta }): { meta: Meta };
  makeRequest: typeof FetchEnginesAPILogic.actions.makeRequest;
  onPaginate(pageNumber: number): { pageNumber: number };
  // loadEngines: () => void; // check if we need this
  // onEnginesLoad({ meta, results }: EnginesListAPIResponse): EnginesListAPIResponse;
  // loadEngines({meta,results}:EnginesListAPIResponse):EnginesListAPIResponse;
}
export interface EngineListValues {
  data: typeof FetchEnginesAPILogic.values.data;
  enginesList: EngineListDetails[];
  meta: Meta;
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
    // loadEngines:true,
  },
  reducers: ({}) => ({}),

  selectors: ({ selectors }) => ({
    enginesList: [() => [selectors.data], (data) => (data?.results ? data.results : [])],
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
