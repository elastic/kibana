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
import { flashAPIErrors, clearFlashMessages } from '../../../shared/flash_messages';
import { updateMetaPageIndex } from '../../../shared/table_pagination';
import { IndicesAPILogic } from '../../logic/indices_api/indices_api_logic';
import { SearchIndex } from '../../types';

export interface IndicesActions {
  makeRequest: typeof IndicesAPILogic.actions.makeRequest;
  apiSuccess({ indices, meta }: { indices: SearchIndex[]; meta: Meta }): {
    indices: SearchIndex[];
    meta: Meta;
  };
  apiError(error: HttpError): HttpError;
  onPaginate(newPageIndex: number): { newPageIndex: number };
}
export interface IndicesValues {
  indices: SearchIndex[];
  meta: Meta;
  isLoading: boolean;
}

export const IndicesLogic = kea<MakeLogicType<IndicesValues, IndicesActions>>({
  connect: {
    actions: [IndicesAPILogic, ['makeRequest', 'apiSuccess', 'apiError']],
  },
  path: ['enterprise_search', 'content', 'indices_logic'],
  actions: {
    onPaginate: (newPageIndex) => ({ newPageIndex }),
  },
  reducers: () => ({
    isLoading: [
      true,
      {
        apiSuccess: () => false,
        apiError: () => false,
        makeRequest: () => true,
      },
    ],
    indices: [
      [],
      {
        apiSuccess: (_, { indices }) => indices,
      },
    ],
    meta: [
      DEFAULT_META,
      {
        apiSuccess: (_, { meta }) => meta,
        onPaginate: (state, { newPageIndex }) => updateMetaPageIndex(state, newPageIndex),
      },
    ],
  }),
  listeners: () => ({
    makeRequest: () => clearFlashMessages(),
    apiError: (e) => flashAPIErrors(e),
  }),
});
