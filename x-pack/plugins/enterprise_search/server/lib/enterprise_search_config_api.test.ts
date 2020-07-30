/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('node-fetch');
const fetchMock = require('node-fetch') as jest.Mock;
const { Response } = jest.requireActual('node-fetch');

import { loggingSystemMock } from 'src/core/server/mocks';

import { callEnterpriseSearchConfigAPI } from './enterprise_search_config_api';

describe('callEnterpriseSearchConfigAPI', () => {
  const mockConfig = {
    host: 'http://localhost:3002',
    accessCheckTimeout: 200,
    accessCheckTimeoutWarning: 100,
  };
  const mockRequest = {
    url: { path: '/app/kibana' },
    headers: { authorization: '==someAuth' },
  };
  const mockDependencies = {
    config: mockConfig,
    request: mockRequest,
    log: loggingSystemMock.create().get(),
  } as any;

  const mockResponse = {
    version: {
      number: '1.0.0',
    },
    settings: {
      external_url: 'http://some.vanity.url/',
    },
    access: {
      user: 'someuser',
      products: {
        app_search: true,
        workplace_search: false,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the config API endpoint', async () => {
    fetchMock.mockImplementationOnce((url: string) => {
      expect(url).toEqual('http://localhost:3002/api/ent/v1/internal/client_config');
      return Promise.resolve(new Response(JSON.stringify(mockResponse)));
    });

    expect(await callEnterpriseSearchConfigAPI(mockDependencies)).toEqual({
      publicUrl: 'http://some.vanity.url/',
      access: {
        hasAppSearchAccess: true,
        hasWorkplaceSearchAccess: false,
      },
    });
  });

  it('returns early if config.host is not set', async () => {
    const config = { host: '' };

    expect(await callEnterpriseSearchConfigAPI({ ...mockDependencies, config })).toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('handles server errors', async () => {
    fetchMock.mockImplementationOnce(() => {
      return Promise.reject('500');
    });
    expect(await callEnterpriseSearchConfigAPI(mockDependencies)).toEqual({});
    expect(mockDependencies.log.error).toHaveBeenCalledWith(
      'Could not perform access check to Enterprise Search: 500'
    );

    fetchMock.mockImplementationOnce(() => {
      return Promise.resolve('Bad Data');
    });
    expect(await callEnterpriseSearchConfigAPI(mockDependencies)).toEqual({});
    expect(mockDependencies.log.error).toHaveBeenCalledWith(
      'Could not perform access check to Enterprise Search: TypeError: response.json is not a function'
    );
  });

  it('handles timeouts', async () => {
    jest.useFakeTimers();

    // Warning
    callEnterpriseSearchConfigAPI(mockDependencies);
    jest.advanceTimersByTime(150);
    expect(mockDependencies.log.warn).toHaveBeenCalledWith(
      'Enterprise Search access check took over 100ms. Please ensure your Enterprise Search server is respondingly normally and not adversely impacting Kibana load speeds.'
    );

    // Timeout
    fetchMock.mockImplementationOnce(async () => {
      jest.advanceTimersByTime(250);
      return Promise.reject({ name: 'AbortError' });
    });
    expect(await callEnterpriseSearchConfigAPI(mockDependencies)).toEqual({});
    expect(mockDependencies.log.warn).toHaveBeenCalledWith(
      "Exceeded 200ms timeout while checking http://localhost:3002. Please consider increasing your enterpriseSearch.accessCheckTimeout value so that users aren't prevented from accessing Enterprise Search plugins due to slow responses."
    );
  });
});
