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
  status: Status;
  data?: T;
  error: HttpError;
}

export interface Actions<Args, Result> {
  makeRequest(args: Args): Args;
  apiError(error: HttpError): HttpError;
  apiSuccess(result: Result): Result;
  apiReset(): void;
}

export const createApiLogic = <Result, Args>(
  path: string[],
  apiFunction: (args: Args) => Promise<Result>
) =>
  kea<MakeLogicType<Values<Result>, Actions<Args, Result>>>({
    path: ['enterprise_search', ...path],
    actions: {
      makeRequest: (args) => args,
      apiError: (error) => error,
      apiSuccess: (result) => result,
      apiReset: true,
    },
    reducers: () => ({
      apiStatus: [
        {
          status: Status.IDLE,
        },
        {
          makeRequest: () => ({
            status: Status.LOADING,
          }),
          apiError: (_, error) => ({
            status: Status.ERROR,
            error,
          }),
          apiSuccess: (_, data) => ({
            status: Status.SUCCESS,
            data,
          }),
          apiReset: () => ({
            status: Status.IDLE,
          }),
        },
      ],
    }),
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
    selectors: ({ selectors }) => ({
      status: [() => [selectors.apiStatus], (apiStatus: ApiStatus<Result>) => apiStatus.status],
      data: [() => [selectors.apiStatus], (apiStatus: ApiStatus<Result>) => apiStatus.data],
      error: [() => [selectors.apiStatus], (apiStatus: ApiStatus<Result>) => apiStatus.error],
    }),
  });
