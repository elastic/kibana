/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('axios', () => jest.fn());

import { Logger } from '@kbn/core/server';
import { ServiceAPIClient } from './service_api_client';
import { UptimeServerSetup } from '../legacy_uptime/lib/adapters';
import { ServiceConfig } from '../../common/config';
import axios from 'axios';

jest.mock('@kbn/server-http-tools', () => ({
  SslConfig: jest.fn().mockImplementation(({ certificate, key }) => ({ certificate, key })),
}));

describe('getHttpsAgent', () => {
  it('does not use certs if basic auth is set', () => {
    const apiClient = new ServiceAPIClient(
      jest.fn() as unknown as Logger,
      { username: 'u', password: 'p' },
      { isDev: true } as UptimeServerSetup
    );
    const { options: result } = apiClient.getHttpsAgent('https://localhost:10001');
    expect(result).not.toHaveProperty('cert');
    expect(result).not.toHaveProperty('key');
  });

  it('rejectUnauthorised is true for requests out of localhost even in dev', () => {
    const apiClient = new ServiceAPIClient(
      jest.fn() as unknown as Logger,
      { tls: { certificate: 'crt', key: 'k' } } as ServiceConfig,
      { isDev: true } as UptimeServerSetup
    );

    const { options: result } = apiClient.getHttpsAgent('https://example.com');
    expect(result).toEqual(expect.objectContaining({ rejectUnauthorized: true }));
  });

  it('use rejectUnauthorised as true out of dev for localhost', () => {
    const apiClient = new ServiceAPIClient(
      jest.fn() as unknown as Logger,
      { tls: { certificate: 'crt', key: 'k' } } as ServiceConfig,
      { isDev: false } as UptimeServerSetup
    );

    const { options: result } = apiClient.getHttpsAgent('https://localhost:10001');
    expect(result).toEqual(expect.objectContaining({ rejectUnauthorized: true }));
  });

  it('uses certs when defined', () => {
    const apiClient = new ServiceAPIClient(
      jest.fn() as unknown as Logger,
      { tls: { certificate: 'crt', key: 'k' } } as ServiceConfig,
      { isDev: false } as UptimeServerSetup
    );

    const { options: result } = apiClient.getHttpsAgent('https://localhost:10001');
    expect(result).toEqual(expect.objectContaining({ cert: 'crt', key: 'k' }));
  });
});

describe('checkAccountAccessStatus', () => {
  beforeEach(() => {
    (axios as jest.MockedFunction<typeof axios>).mockReset();
  });

  afterEach(() => jest.restoreAllMocks());

  it('includes a header with the kibana version', async () => {
    const apiClient = new ServiceAPIClient(
      jest.fn() as unknown as Logger,
      { tls: { certificate: 'crt', key: 'k' } } as ServiceConfig,
      { isDev: false, stackVersion: '8.4' } as UptimeServerSetup
    );

    apiClient.locations = [
      {
        id: 'test-location',
        url: 'http://localhost',
        label: 'Test location',
        isServiceManaged: true,
      },
    ];

    (axios as jest.MockedFunction<typeof axios>).mockResolvedValue({
      status: 200,
      statusText: 'ok',
      headers: {},
      config: {},
      data: { allowed: true, signupUrl: 'http://localhost:666/example' },
    });

    const result = await apiClient.checkAccountAccessStatus();

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({ headers: { 'x-kibana-version': '8.4' } })
    );

    expect(result).toEqual({ allowed: true, signupUrl: 'http://localhost:666/example' });
  });
});
