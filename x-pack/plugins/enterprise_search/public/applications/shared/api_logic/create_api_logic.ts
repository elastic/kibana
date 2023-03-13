/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { ApiStatus, Status, HttpError } from '../../../../common/types/api';
import { clearFlashMessages, flashAPIErrors, flashSuccessToast } from '../flash_messages';

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

export interface CreateApiOptions<Result> {
  clearFlashMessagesOnMakeRequest: boolean;
  requestBreakpointMS?: number;
  showErrorFlash: boolean;
  showSuccessFlashFn?: (result: Result) => string;
}

const DEFAULT_CREATE_API_OPTIONS = {
  clearFlashMessagesOnMakeRequest: true,
  showErrorFlash: true,
};

export const createApiLogic = <Result, Args>(
  path: string[],
  apiFunction: (args: Args) => Promise<Result>,
  incomingOptions: Partial<CreateApiOptions<Result>> = {}
) => {
  const options = { ...DEFAULT_CREATE_API_OPTIONS, ...incomingOptions };

  return kea<MakeLogicType<Values<Result>, Actions<Args, Result>>>({
    actions: {
      apiError: (error) => error,
      apiReset: true,
      apiSuccess: (result) => result,
      makeRequest: (args) => args,
    },
    listeners: ({ actions }) => ({
      apiError: (error) => {
        if (options.showErrorFlash) {
          flashAPIErrors(error);
        }
      },
      apiSuccess: (result) => {
        if (options.showSuccessFlashFn) {
          flashSuccessToast(options.showSuccessFlashFn(result));
        }
      },
      makeRequest: async (args, breakpoint) => {
        if (options.clearFlashMessagesOnMakeRequest) {
          clearFlashMessages();
        }
        if (options.requestBreakpointMS) {
          await breakpoint(options.requestBreakpointMS);
        }
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
};
