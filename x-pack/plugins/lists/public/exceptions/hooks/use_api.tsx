/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';

import * as Api from '../api';
import { HttpStart } from '../../../../../../src/core/public';
import { ExceptionListItemSchema, ExceptionListSchema } from '../../../common/schemas';
import { ApiCallMemoProps } from '../types';

export interface ExceptionsApi {
  deleteExceptionItem: (arg: ApiCallMemoProps) => Promise<void>;
  deleteExceptionList: (arg: ApiCallMemoProps) => Promise<void>;
  getExceptionItem: (
    arg: ApiCallMemoProps & { onSuccess: (arg: ExceptionListItemSchema) => void }
  ) => Promise<void>;
  getExceptionList: (
    arg: ApiCallMemoProps & { onSuccess: (arg: ExceptionListSchema) => void }
  ) => Promise<void>;
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
    }),
    [http]
  );
};
