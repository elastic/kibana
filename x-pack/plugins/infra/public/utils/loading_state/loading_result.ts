/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface UninitializedLoadingResult {
  result: 'uninitialized';
}

interface SuccessLoadingResult<Parameters> {
  result: 'success';
  time: number;
  isExhausted: boolean;
  parameters: Parameters;
}

interface FailureLoadingResult<Parameters> {
  result: 'failure';
  time: number;
  reason: string;
  parameters: Parameters;
}

export type LoadingResult<Parameters> =
  | UninitializedLoadingResult
  | SuccessLoadingResult<Parameters>
  | FailureLoadingResult<Parameters>;

export const isUninitializedLoadingResult = <P>(
  loadingResult: LoadingResult<P>
): loadingResult is UninitializedLoadingResult => loadingResult.result === 'uninitialized';

export const isSuccessLoadingResult = <P>(
  loadingResult: LoadingResult<P>
): loadingResult is SuccessLoadingResult<P> => loadingResult.result === 'success';

export const isFailureLoadingResult = <P>(
  loadingResult: LoadingResult<P>
): loadingResult is FailureLoadingResult<P> => loadingResult.result === 'failure';

export const isExhaustedLoadingResult = <P>(loadingResult: LoadingResult<P>) =>
  isSuccessLoadingResult(loadingResult) && loadingResult.isExhausted;

interface GetTimeOrDefaultT {
  <P>(loadingResult: LoadingResult<P>): number | null;
  <P, T>(loadingResult: LoadingResult<P>, defaultValue: T): number | T;
  <P, T>(loadingResult: LoadingResult<P>, defaultValue?: T): number | T | null;
}

export const getTimeOrDefault: GetTimeOrDefaultT = <P, T>(
  loadingResult: LoadingResult<P>,
  defaultValue?: T
) => (isUninitializedLoadingResult(loadingResult) ? defaultValue || null : loadingResult.time);

export const createSuccessResult = <Parameters = any, Payload = any>(
  parameters: Parameters,
  isExhausted: boolean
): SuccessLoadingResult<Parameters> => ({
  isExhausted,
  parameters,
  result: 'success',
  time: Date.now(),
});

export const createSuccessResultReducer = <Parameters = any, Payload = any>(
  isExhausted: (params: Parameters, result: Payload) => boolean
) => (
  state: LoadingResult<Parameters>,
  { params, result }: { params: Parameters; result: Payload }
): SuccessLoadingResult<Parameters> => createSuccessResult(params, isExhausted(params, result));

export const createFailureResult = <Parameters = any, ErrorPayload = any>(
  parameters: Parameters,
  reason: string
): FailureLoadingResult<Parameters> => ({
  parameters,
  reason,
  result: 'failure',
  time: Date.now(),
});

export const createFailureResultReducer = <Parameters = any, ErrorPayload = any>(
  convertErrorToString: (error: ErrorPayload) => string = (error) => `${error}`
) => (
  state: LoadingResult<Parameters>,
  { params, error }: { params: Parameters; error: ErrorPayload }
): FailureLoadingResult<Parameters> => createFailureResult(params, convertErrorToString(error));
