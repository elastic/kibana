/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';

import * as Api from '../api';
import { HttpStart } from '../../../../../../src/core/public';
import {
  ExceptionListItemSchema,
  ExceptionListSchema,
  NamespaceType,
} from '../../../common/schemas';
import { ApiCallFindListsItemsMemoProps, ApiCallMemoProps } from '../types';

export interface ExceptionsApi {
  deleteExceptionItem: (arg: ApiCallMemoProps) => Promise<void>;
  deleteExceptionList: (arg: ApiCallMemoProps) => Promise<void>;
  getExceptionItem: (
    arg: ApiCallMemoProps & { onSuccess: (arg: ExceptionListItemSchema) => void }
  ) => Promise<void>;
  getExceptionList: (
    arg: ApiCallMemoProps & { onSuccess: (arg: ExceptionListSchema) => void }
  ) => Promise<void>;
  getExceptionListsItems: (arg: ApiCallFindListsItemsMemoProps) => Promise<void>;
}

export const useApi = (http: HttpStart): ExceptionsApi => {
  return useMemo(
    (): ExceptionsApi => ({
      async deleteExceptionItem({
        id,
        namespaceType,
        onSuccess,
        onError,
      }: ApiCallMemoProps): Promise<void> {
        const abortCtrl = new AbortController();

        try {
          await Api.deleteExceptionListItemById({
            http,
            id,
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
        namespaceType,
        onSuccess,
        onError,
      }: ApiCallMemoProps): Promise<void> {
        const abortCtrl = new AbortController();

        try {
          await Api.deleteExceptionListById({
            http,
            id,
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
        namespaceType,
        onSuccess,
        onError,
      }: ApiCallMemoProps & { onSuccess: (arg: ExceptionListItemSchema) => void }): Promise<void> {
        const abortCtrl = new AbortController();

        try {
          const item = await Api.fetchExceptionListItemById({
            http,
            id,
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
        namespaceType,
        onSuccess,
        onError,
      }: ApiCallMemoProps & { onSuccess: (arg: ExceptionListSchema) => void }): Promise<void> {
        const abortCtrl = new AbortController();

        try {
          const list = await Api.fetchExceptionListById({
            http,
            id,
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
        const { ids, namespaces } = lists
          .filter((list) => {
            if (showDetectionsListsOnly) {
              return list.type === 'detection';
            } else if (showEndpointListsOnly) {
              return list.type === 'endpoint';
            } else {
              return true;
            }
          })
          .reduce<{ ids: string[]; namespaces: NamespaceType[] }>(
            (acc, { listId, namespaceType }) => ({
              ids: [...acc.ids, listId],
              namespaces: [...acc.namespaces, namespaceType],
            }),
            { ids: [], namespaces: [] }
          );

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
          }
        } catch (error) {
          onError(error);
        }
      },
    }),
    [http]
  );
};
