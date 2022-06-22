/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { IndicesLogic, IndicesValues, IndicesActions } from '../../logic/search_indices';

export interface SearchIndicesActions extends IndicesActions {
  initPage(): void;
}

export const SearchIndicesLogic = kea<MakeLogicType<IndicesValues, SearchIndicesActions>>({
  path: ['enterprise_search', 'content', 'search_indices'],
  connect: {
    actions: [
      IndicesLogic,
      ['fetchSearchIndices', 'fetchSearchIndicesSuccess', 'fetchSearchIndicesError', 'onPaginate'],
    ],
    values: [IndicesLogic, ['indices', 'meta']],
  },
  actions: {
    initPage: true,
  },
  listeners: ({ actions }) => ({
    initPage: async () => {
      actions.fetchSearchIndices();
    },
  }),
});
