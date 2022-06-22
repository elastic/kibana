/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { ApiStatus, Status, HttpError } from '../../../../common/types/api';
import { flashAPIErrors, clearFlashMessages } from '../flash_messages';

export interface Values<T> {
  apiStatus: ApiStatus<T>;
  status: Status;
  data?: T;
  error: HttpError;
}

export interface Actions<Args extends Record<string, unknown> | undefined, Result> {
  initiateCall(args: Args): Args;
  apiError(code: number, error: string): HttpError;
  apiSuccess(result: Result): Result;
  apiReset(): void;
}

export const createApiLogic = <Result, Args extends Record<string, unknown> | undefined>(
  path: string[],
  apiFunction: (args: Args) => Promise<Result>
) =>
  kea<MakeLogicType<Values<Result>, Actions<Args, Result>>>({
    path: ['enterprise_search', 'workplace_search', ...path],
    actions: {
      initiateCall: (args) => args,
      apiError: (code, error) => ({ code, error }),
      apiSuccess: (result) => result,
      apiReset: true,
    },
    reducers: () => ({
      apiStatus: [
        {
          status: 'IDLE',
        },
        {
          initiateCall: () => ({
            status: 'LOADING',
          }),
          apiError: (_, error) => ({
            status: 'ERROR',
            error,
          }),
          apiSuccess: (_, data) => ({
            status: 'SUCCESS',
            data,
          }),
          apiReset: () => ({
            status: 'IDLE',
          }),
        },
      ],
    }),
    listeners: ({ actions }) => ({
      initiateCall: async (args) => {
        clearFlashMessages();
        try {
          const result = await apiFunction(args);
          actions.apiSuccess(result);
        } catch (e) {
          flashAPIErrors(e);
          actions.apiError(e?.body?.statusCode, e?.body?.message);
        }
      },
    }),
    selectors: ({ selectors }) => ({
      status: [() => [selectors.apiStatus], (apiStatus: ApiStatus<Result>) => apiStatus.status],
      data: [
        () => [selectors.apiStatus],
        (apiStatus: ApiStatus<Result>) =>
          apiStatus.status === 'SUCCESS' ? apiStatus.data : undefined,
      ],
      error: [
        () => [selectors.apiStatus],
        (apiStatus: ApiStatus<Result>) =>
          apiStatus.status === 'ERROR' ? apiStatus.error : undefined,
      ],
    }),
  });
