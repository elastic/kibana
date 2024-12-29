/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as callApiExports from './rest/call_api';
import { createCallApmApi, callApmApi } from './rest/create_call_apm_api';
import { CoreStart } from '@kbn/core/public';

const callApi = jest
  .spyOn(callApiExports, 'callApi')
  .mockImplementation(() => Promise.resolve(null));

describe('callApmApi', () => {
  beforeEach(() => {
    createCallApmApi({} as CoreStart);
  });

  afterEach(() => {
    callApi.mockClear();
  });

  it('should format the pathname with the given path params', async () => {
    // @ts-expect-error
    await callApmApi('GET /internal/apm/{param1}/to/{param2}', {
      params: {
        path: {
          param1: 'foo',
          param2: 'bar',
        },
      },
    } as never);

    expect(callApi).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        pathname: '/internal/apm/foo/to/bar',
      })
    );
  });

  it('should add the query parameters to the options object', async () => {
    // @ts-expect-error
    await callApmApi('GET /internal/apm', {
      params: {
        query: {
          foo: 'bar',
          bar: 'foo',
        },
      },
    } as never);

    expect(callApi).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        pathname: '/internal/apm',
        query: {
          foo: 'bar',
          bar: 'foo',
        },
      })
    );
  });

  it('should stringify the body and add it to the options object', async () => {
    // @ts-expect-error
    await callApmApi('POST /internal/apm', {
      params: {
        body: {
          foo: 'bar',
          bar: 'foo',
        },
      },
    } as never);

    expect(callApi).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        pathname: '/internal/apm',
        method: 'post',
        body: {
          foo: 'bar',
          bar: 'foo',
        },
      })
    );
  });
});
