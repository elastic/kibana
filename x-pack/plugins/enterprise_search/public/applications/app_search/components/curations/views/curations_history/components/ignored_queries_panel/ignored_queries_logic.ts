/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import { Meta } from '../../../../../../../../../common/types';
import { DEFAULT_META } from '../../../../../../../shared/constants';
import { flashAPIErrors, flashSuccessToast } from '../../../../../../../shared/flash_messages';
import { HttpLogic } from '../../../../../../../shared/http';
import { updateMetaPageIndex } from '../../../../../../../shared/table_pagination';
import { EngineLogic } from '../../../../../engine';
import { CurationSuggestion } from '../../../../types';

interface IgnoredQueriesValues {
  dataLoading: boolean;
  ignoredQueries: string[];
  meta: Meta;
}

interface IgnoredQueriesActions {
  allowIgnoredQuery(ignoredQuery: string): {
    ignoredQuery: string;
  };
  loadIgnoredQueries(): void;
  onIgnoredQueriesLoad(
    ignoredQueries: string[],
    meta: Meta
  ): { ignoredQueries: string[]; meta: Meta };
  onPaginate(newPageIndex: number): { newPageIndex: number };
}

interface SuggestionUpdateError {
  error: string;
}

const ALLOW_SUCCESS_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.curations.ignoredSuggestionsPanel.allowQuerySuccessMessage',
  {
    defaultMessage: 'You’ll be notified about future suggestions for this query',
  }
);

export const IgnoredQueriesLogic = kea<MakeLogicType<IgnoredQueriesValues, IgnoredQueriesActions>>({
  path: ['enterprise_search', 'app_search', 'curations', 'ignored_queries_panel_logic'],
  actions: () => ({
    allowIgnoredQuery: (ignoredQuery) => ({ ignoredQuery }),
    loadIgnoredQueries: true,
    onIgnoredQueriesLoad: (ignoredQueries, meta) => ({ ignoredQueries, meta }),
    onPaginate: (newPageIndex) => ({ newPageIndex }),
  }),
  reducers: () => ({
    dataLoading: [
      true,
      {
        onIgnoredQueriesLoad: () => false,
      },
    ],
    ignoredQueries: [
      [],
      {
        onIgnoredQueriesLoad: (_, { ignoredQueries }) => ignoredQueries,
      },
    ],
    meta: [
      {
        ...DEFAULT_META,
        page: {
          ...DEFAULT_META.page,
          size: 10,
        },
      },
      {
        onIgnoredQueriesLoad: (_, { meta }) => meta,
        onPaginate: (state, { newPageIndex }) => updateMetaPageIndex(state, newPageIndex),
      },
    ],
  }),
  listeners: ({ actions, values }) => ({
    loadIgnoredQueries: async () => {
      const { meta } = values;
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const response: { results: CurationSuggestion[]; meta: Meta } = await http.post(
          `/internal/app_search/engines/${engineName}/adaptive_relevance/suggestions`,
          {
            body: JSON.stringify({
              page: {
                current: meta.page.current,
                size: meta.page.size,
              },
              filters: {
                status: ['disabled'],
                type: 'curation',
              },
            }),
          }
        );

        const queries = response.results.map((suggestion) => suggestion.query);
        actions.onIgnoredQueriesLoad(queries, response.meta);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    allowIgnoredQuery: async ({ ignoredQuery }) => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;
      try {
        const response = await http.put<{
          results: Array<CurationSuggestion | SuggestionUpdateError>;
        }>(`/internal/app_search/engines/${engineName}/adaptive_relevance/suggestions`, {
          body: JSON.stringify([
            {
              query: ignoredQuery,
              type: 'curation',
              status: 'rejected',
            },
          ]),
        });

        if (response.results[0].hasOwnProperty('error')) {
          throw (response.results[0] as SuggestionUpdateError).error;
        }

        flashSuccessToast(ALLOW_SUCCESS_MESSAGE);
        // re-loading to update the current page rather than manually remove the query
        actions.loadIgnoredQueries();
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
