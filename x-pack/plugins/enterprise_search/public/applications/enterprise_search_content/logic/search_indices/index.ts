/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { HttpError } from '../../../../../common/types/api';
import { flashAPIErrors } from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { SearchIndex } from '../../types';

export interface IndicesValues {
  indices: SearchIndex[];
  meta: {
    page: {
      current: number;
      size: number;
      totalPages: number;
      totalResults: number;
    };
  };
}

export interface IndicesActions {
  fetchSearchIndices(): void;
  fetchSearchIndicesError(code: number, error: string): HttpError;
  fetchSearchIndicesSuccess(indicesResponse: { indices: SearchIndex[]; meta: object }): {
    indices: SearchIndex[];
    meta: {
      page: {
        current: number;
        size: number;
        totalPages: number;
        totalResults: number;
      };
    };
  };
}

export const IndicesLogic = kea<MakeLogicType<IndicesValues, IndicesActions>>({
  path: ['enterprise_search', 'content', 'logic', 'search_indices'],
  actions: {
    fetchSearchIndices: true,
    fetchSearchIndicesError: (code, error) => ({ code, error }),
    fetchSearchIndicesSuccess: (indicesResponse) => indicesResponse,
  },
  reducers: {
    indices: [
      [],
      {
        fetchSearchIndicesSuccess: (_, { indices }) => indices,
      },
    ],
    meta: [
      {
        page: {
          current: 0,
          size: 1,
          totalPages: 0,
          totalResults: 0,
        },
      },
      {
        fetchSearchIndicesSuccess: (_, { meta }) => meta,
      },
    ],
  },
  listeners: ({ actions, values }) => ({
    fetchSearchIndices: async () => {
      const { http } = HttpLogic.values;
      const { meta } = values;
      try {
        const response = await http.get<{ indices: SearchIndex[]; meta: object }>(
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
