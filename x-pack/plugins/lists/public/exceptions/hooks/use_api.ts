/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';

import * as Api from '../api';
import { HttpStart } from '../../../../../../src/core/public';
import { ExceptionListItemSchema, ExceptionListSchema } from '../../../common/schemas';
import {
  ApiCallFindListsItemsMemoProps,
  ApiCallListItemMemoProps,
  ApiCallListMemoProps,
} from '../types';
import { getIdsAndNamespaces } from '../utils';

export interface ExceptionsApi {
  deleteExceptionItem: (arg: ApiCallListItemMemoProps) => Promise<void>;
  deleteExceptionList: (arg: ApiCallListMemoProps) => Promise<void>;
  getExceptionItem: (
    arg: ApiCallListItemMemoProps & { onSuccess: (arg: ExceptionListItemSchema) => void }
  ) => Promise<void>;
  getExceptionList: (
    arg: ApiCallListMemoProps & { onSuccess: (arg: ExceptionListSchema) => void }
  ) => Promise<void>;
  getExceptionListsItems: (arg: ApiCallFindListsItemsMemoProps) => Promise<void>;
}

export const useApi = (http: HttpStart): ExceptionsApi => {
  return useMemo(
    (): ExceptionsApi => ({
      async deleteExceptionItem({
        id,
        itemId,
        namespaceType,
        onSuccess,
        onError,
      }: ApiCallListItemMemoProps): Promise<void> {
        const abortCtrl = new AbortController();

        try {
          await Api.deleteExceptionListItem({
            http,
            id,
            itemId,
            namespaceType,
            signal: abortCtrl.signal,
          });
          onSuccess();
        } catch (error) {
          onError(error);
        }
      },
      async deleteExceptionList({
        id,
        listId,
        namespaceType,
        onSuccess,
        onError,
      }: ApiCallListMemoProps): Promise<void> {
        const abortCtrl = new AbortController();

        try {
          await Api.deleteExceptionList({
            http,
            id,
            listId,
            namespaceType,
            signal: abortCtrl.signal,
          });
          onSuccess();
        } catch (error) {
          onError(error);
        }
      },
      async getExceptionItem({
        id,
        itemId,
        namespaceType,
        onSuccess,
        onError,
      }: ApiCallListItemMemoProps & { onSuccess: (arg: ExceptionListItemSchema) => void }): Promise<
        void
      > {
        const abortCtrl = new AbortController();

        try {
          const item = await Api.fetchExceptionListItem({
            http,
            id,
            itemId,
            namespaceType,
            signal: abortCtrl.signal,
          });
          onSuccess(item);
        } catch (error) {
          onError(error);
        }
      },
      async getExceptionList({
        id,
        listId,
        namespaceType,
        onSuccess,
        onError,
      }: ApiCallListMemoProps & { onSuccess: (arg: ExceptionListSchema) => void }): Promise<void> {
        const abortCtrl = new AbortController();

        try {
          const list = await Api.fetchExceptionList({
            http,
            id,
            listId,
            namespaceType,
            signal: abortCtrl.signal,
          });
          onSuccess(list);
        } catch (error) {
          onError(error);
        }
      },
      async getExceptionListsItems({
        lists,
        filterOptions,
        pagination,
        showDetectionsListsOnly,
        showEndpointListsOnly,
        onSuccess,
        onError,
      }: ApiCallFindListsItemsMemoProps): Promise<void> {
        const abortCtrl = new AbortController();
        const { ids, namespaces } = getIdsAndNamespaces({
          lists,
          showDetection: showDetectionsListsOnly,
          showEndpoint: showEndpointListsOnly,
        });

        try {
          if (ids.length > 0 && namespaces.length > 0) {
            const {
              data,
              page,
              per_page: perPage,
              total,
            } = await Api.fetchExceptionListsItemsByListIds({
              filterOptions,
              http,
              listIds: ids,
              namespaceTypes: namespaces,
              pagination,
              signal: abortCtrl.signal,
            });
            onSuccess({
              exceptions: data,
              pagination: {
                page,
                perPage,
                total,
              },
            });
          } else {
            onSuccess({
              exceptions: [],
              pagination: {
                page: 0,
                perPage: pagination.perPage ?? 0,
                total: 0,
              },
            });
          }
        } catch (error) {
          onError(error);
        }
      },
    }),
    [http]
  );
};
