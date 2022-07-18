/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Meta } from '../../../../../common/types';
import { HttpError, Status } from '../../../../../common/types/api';
import { DEFAULT_META } from '../../../shared/constants';
import { flashAPIErrors, clearFlashMessages } from '../../../shared/flash_messages';
import { updateMetaPageIndex } from '../../../shared/table_pagination';
import { IndicesAPILogic } from '../../logic/indices_api/indices_api_logic';
import { SearchIndex } from '../../types';

export interface IndicesActions {
  apiError(error: HttpError): HttpError;
  apiSuccess({ indices, meta }: { indices: SearchIndex[]; meta: Meta }): {
    indices: SearchIndex[];
    meta: Meta;
  };
  makeRequest: typeof IndicesAPILogic.actions.makeRequest;
  onPaginate(newPageIndex: number): { newPageIndex: number };
}
export interface IndicesValues {
  data: typeof IndicesAPILogic.values.data;
  indices: SearchIndex[];
  isLoading: boolean;
  meta: Meta;
  status: typeof IndicesAPILogic.values.status;
}

export const IndicesLogic = kea<MakeLogicType<IndicesValues, IndicesActions>>({
  actions: { onPaginate: (newPageIndex) => ({ newPageIndex }) },
  connect: {
    actions: [IndicesAPILogic, ['makeRequest', 'apiSuccess', 'apiError']],
    values: [IndicesAPILogic, ['data', 'status']],
  },
  listeners: () => ({
    apiError: (e) => flashAPIErrors(e),
    makeRequest: () => clearFlashMessages(),
  }),
  path: ['enterprise_search', 'content', 'indices_logic'],
  reducers: () => ({
    meta: [
      DEFAULT_META,
      {
        apiSuccess: (_, { meta }) => meta,
        onPaginate: (state, { newPageIndex }) => updateMetaPageIndex(state, newPageIndex),
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    indices: [() => [selectors.data], (data) => data?.indices || []],
    isLoading: [
      () => [selectors.status],
      (status) => {
        return status === Status.LOADING;
      },
    ],
  }),
});
