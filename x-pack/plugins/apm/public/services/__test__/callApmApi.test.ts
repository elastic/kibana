/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as callApiExports from '../rest/callApi';
import { createCallApmApi, callApmApi } from '../rest/createCallApmApi';
import { HttpSetup } from 'kibana/public';

const callApi = jest
  .spyOn(callApiExports, 'callApi')
  .mockImplementation(() => Promise.resolve(null));

describe('callApmApi', () => {
  beforeEach(() => {
    createCallApmApi({} as HttpSetup);
  });

  afterEach(() => {
    callApi.mockClear();
  });

  it('should format the pathname with the given path params', async () => {
    await callApmApi({
      pathname: '/api/apm/{param1}/to/{param2}',
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
        pathname: '/api/apm/foo/to/bar',
      })
    );
  });

  it('should add the query parameters to the options object', async () => {
    await callApmApi({
      pathname: '/api/apm',
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
        pathname: '/api/apm',
        query: {
          foo: 'bar',
          bar: 'foo',
        },
      })
    );
  });

  it('should stringify the body and add it to the options object', async () => {
    await callApmApi({
      pathname: '/api/apm',
      method: 'POST',
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
        pathname: '/api/apm',
        method: 'POST',
        body: {
          foo: 'bar',
          bar: 'foo',
        },
      })
    );
  });
});
