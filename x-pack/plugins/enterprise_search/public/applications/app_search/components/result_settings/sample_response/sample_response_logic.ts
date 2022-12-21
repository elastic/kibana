/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import { flashAPIErrors } from '../../../../shared/flash_messages';

import { HttpLogic } from '../../../../shared/http';
import { EngineLogic } from '../../engine';

import { FieldValue } from '../../result/types';
import { SampleSearchResponse, ServerFieldResultSettingObject } from '../types';

const NO_RESULTS_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.resultSettings.sampleResponse.noResultsMessage',
  { defaultMessage: 'No results.' }
);

const ERROR_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.resultSettings.sampleResponse.errorMessage',
  { defaultMessage: 'An error occured.' }
);

interface SampleResponseValues {
  query: string;
  response: SampleSearchResponse | string | null;
}

interface SampleResponseActions {
  queryChanged: (query: string) => { query: string };
  getSearchResultsSuccess: (response: SampleSearchResponse | string) => {
    response: SampleSearchResponse | string;
  };
  getSearchResultsFailure: (response: string) => { response: string };
  getSearchResults: (
    query: string,
    resultFields: ServerFieldResultSettingObject
  ) => { query: string; resultFields: ServerFieldResultSettingObject };
}

export const SampleResponseLogic = kea<MakeLogicType<SampleResponseValues, SampleResponseActions>>({
  path: ['enterprise_search', 'app_search', 'sample_response_logic'],
  actions: {
    queryChanged: (query) => ({ query }),
    getSearchResultsSuccess: (response) => ({ response }),
    getSearchResultsFailure: (response) => ({ response }),
    getSearchResults: (query, resultFields) => ({ query, resultFields }),
  },
  reducers: {
    query: ['', { queryChanged: (_, { query }) => query }],
    response: [
      null,
      {
        getSearchResultsSuccess: (_, { response }) => response,
        getSearchResultsFailure: (_, { response }) => response,
      },
    ],
  },
  listeners: ({ actions }) => ({
    getSearchResults: async ({ query, resultFields }, breakpoint) => {
      await breakpoint(250);

      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      const url = `/internal/app_search/engines/${engineName}/search`;

      try {
        const response = await http.post<{ results: Array<Record<string, FieldValue>> }>(url, {
          query: { query },
          body: JSON.stringify({
            page: {
              size: 1,
              current: 1,
            },
            result_fields: resultFields,
          }),
        });

        const result = response.results?.[0];
        actions.getSearchResultsSuccess(
          // @ts-expect-error TS2345
          result ? { ...result, _meta: undefined } : NO_RESULTS_MESSAGE
        );
      } catch (e) {
        if (e.response.status >= 500) {
          // 4XX Validation errors are expected, as a user could enter something like 2 as a size, which is out of valid range.
          // In this case, we simply render the message from the server as the response.
          //
          // 5xx Server errors are unexpected, and need to be reported in a flash message.
          flashAPIErrors(e);
          actions.getSearchResultsFailure(ERROR_MESSAGE);
        } else {
          actions.getSearchResultsFailure(e.body?.attributes || ERROR_MESSAGE);
        }
      }
    },
  }),
});
