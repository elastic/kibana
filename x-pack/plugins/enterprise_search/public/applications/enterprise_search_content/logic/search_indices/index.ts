/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Meta } from '../../../../../common/types';
import { HttpError } from '../../../../../common/types/api';
import { DEFAULT_META } from '../../../shared/constants';
import { flashAPIErrors } from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { updateMetaPageIndex } from '../../../shared/table_pagination';
import { SearchIndex } from '../../types';

export interface IndicesValues {
  indices: SearchIndex[];
  meta: Meta;
}

export interface IndicesActions {
  fetchSearchIndices(): void;
  fetchSearchIndicesError(code: number, error: string): HttpError;
  fetchSearchIndicesSuccess(indicesResponse: { indices: SearchIndex[]; meta: Meta }): {
    indices: SearchIndex[];
    meta: Meta;
  };
  onPaginate(newPageIndex: number): { newPageIndex: number };
}

export const IndicesLogic = kea<MakeLogicType<IndicesValues, IndicesActions>>({
  path: ['enterprise_search', 'content', 'logic', 'search_indices'],
  actions: {
    fetchSearchIndices: true,
    fetchSearchIndicesError: (code, error) => ({ code, error }),
    fetchSearchIndicesSuccess: (indicesResponse) => indicesResponse,
    onPaginate: (newPageIndex) => ({ newPageIndex }),
  },
  reducers: {
    indices: [
      [],
      {
        fetchSearchIndicesSuccess: (_, { indices }) => indices,
      },
    ],
    meta: [
      DEFAULT_META,
      {
        fetchSearchIndicesSuccess: (_, { meta }) => meta,
        onPaginate: (state, { newPageIndex }) => updateMetaPageIndex(state, newPageIndex),
      },
    ],
  },
  listeners: ({ actions, values }) => ({
    fetchSearchIndices: async () => {
      console.log('aaa');
      const { http } = HttpLogic.values;
      const { meta } = values;
      try {
        const response = await http.get<{ indices: SearchIndex[]; meta: Meta }>(
          '/internal/enterprise_search/indices',
          {
            query: {
              page: meta.page.current,
              size: meta.page.size,
            },
          }
        );
        actions.fetchSearchIndicesSuccess(response);
      } catch (e) {
        actions.fetchSearchIndicesError(e.code, e.status);
        flashAPIErrors(e);
      }
    },
  }),
});
