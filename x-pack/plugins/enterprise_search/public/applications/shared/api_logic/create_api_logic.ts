/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { ApiStatus, Status, HttpError } from '../../../../common/types/api';

export interface Values<T> {
  apiStatus: ApiStatus<T>;
  data?: T;
  error: HttpError;
  status: Status;
}

export interface Actions<Args, Result> {
  apiError(error: HttpError): HttpError;
  apiReset(): void;
  apiSuccess(result: Result): Result;
  makeRequest(args: Args): Args;
}

export const createApiLogic = <Result, Args>(
  path: string[],
  apiFunction: (args: Args) => Promise<Result>
) =>
  kea<MakeLogicType<Values<Result>, Actions<Args, Result>>>({
    actions: {
      apiError: (error) => error,
      apiReset: true,
      apiSuccess: (result) => result,
      makeRequest: (args) => args,
    },
    listeners: ({ actions }) => ({
      makeRequest: async (args) => {
        try {
          const result = await apiFunction(args);
          actions.apiSuccess(result);
        } catch (e) {
          actions.apiError(e);
        }
      },
    }),
    path: ['enterprise_search', 'api', ...path],
    reducers: () => ({
      apiStatus: [
        {
          status: Status.IDLE,
        },
        {
          apiError: (_, error) => ({
            error,
            status: Status.ERROR,
          }),
          apiReset: () => ({ status: Status.IDLE }),
          apiSuccess: (_, data) => ({
            data,
            status: Status.SUCCESS,
          }),
          makeRequest: ({ data }) => {
            return {
              data,
              status: Status.LOADING,
            };
          },
        },
      ],
    }),
    selectors: ({ selectors }) => ({
      data: [() => [selectors.apiStatus], (apiStatus: ApiStatus<Result>) => apiStatus.data],
      error: [() => [selectors.apiStatus], (apiStatus: ApiStatus<Result>) => apiStatus.error],
      status: [() => [selectors.apiStatus], (apiStatus: ApiStatus<Result>) => apiStatus.status],
    }),
  });
