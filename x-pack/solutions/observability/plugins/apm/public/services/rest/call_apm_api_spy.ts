/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { once } from 'lodash';
import { createCallApmApi, callApmApi } from './create_call_apm_api';
import type {
  AbstractAPMClient,
  APIClientRequestParamsOf,
  APIReturnType,
} from './create_call_apm_api';
import { type APIEndpoint } from '../../../server';

const spyObj = { createCallApmApi, callApmApi };

export type CallApmApiSpy = jest.SpyInstance<Promise<any>, Parameters<AbstractAPMClient>>;

export type CreateCallApmApiSpy = jest.SpyInstance<AbstractAPMClient>;

export const getCallApmApiSpy = () => jest.spyOn(spyObj, 'callApmApi') as unknown as CallApmApiSpy;

type MockApmApiCall = <TEndpoint extends APIEndpoint>(
  endpoint: TEndpoint,
  fn: (params: APIClientRequestParamsOf<TEndpoint>) => APIReturnType<TEndpoint>
) => void;

const getSpy = once(() => {
  const spy = getCallApmApiSpy();

  const cache: Record<string, Function> = {};

  const response: MockApmApiCall = (endpoint, fn) => {
    cache[endpoint] = fn;
  };

  spy.mockImplementation((endpoint, params) => {
    const fn = cache[endpoint];

    if (fn) {
      return Promise.resolve(fn(params));
    }

    throw new Error('No cached response defined for ' + endpoint);
  });

  return {
    response,
  };
});

export const mockApmApiCallResponse: MockApmApiCall = (...args) => {
  getSpy().response(...args);
};
