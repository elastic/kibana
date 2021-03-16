/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from 'kibana/server';
import { elasticsearchServiceMock } from 'src/core/server/mocks';

import { authenticateAgentWithAccessToken } from './authenticate';

describe('test agent autenticate services', () => {
  it('should succeed with a valid API key and an active agent', async () => {
    const mockEsClient = elasticsearchServiceMock.createInternalClient();

    mockEsClient.search.mockResolvedValue({
      body: {
        hits: {
          hits: [
            {
              // @ts-expect-error
              _id: 'agent1',
              _source: {
                // @ts-expect-error
                active: true,
                // @ts-expect-error
                access_api_key_id: 'pedTuHIBTEDt93wW0Fhr',
              },
            },
          ],
        },
      },
    });
    await authenticateAgentWithAccessToken(mockEsClient, {
      auth: { isAuthenticated: true },
      headers: {
        authorization: 'ApiKey cGVkVHVISUJURUR0OTN3VzBGaHI6TnU1U0JtbHJSeC12Rm9qQWpoSHlUZw==',
      },
    } as KibanaRequest);
  });

  it('should throw if the request is not authenticated', async () => {
    const mockEsClient = elasticsearchServiceMock.createInternalClient();

    mockEsClient.search.mockResolvedValue({
      body: {
        hits: {
          hits: [
            {
              // @ts-expect-error
              _id: 'agent1',
              _source: {
                // @ts-expect-error
                active: true,
                // @ts-expect-error
                access_api_key_id: 'pedTuHIBTEDt93wW0Fhr',
              },
            },
          ],
        },
      },
    });
    expect(
      authenticateAgentWithAccessToken(mockEsClient, {
        auth: { isAuthenticated: false },
        headers: {
          authorization: 'ApiKey cGVkVHVISUJURUR0OTN3VzBGaHI6TnU1U0JtbHJSeC12Rm9qQWpoSHlUZw==',
        },
      } as KibanaRequest)
    ).rejects.toThrow(/Request not authenticated/);
  });

  it('should throw if the ApiKey headers is malformed', async () => {
    const mockEsClient = elasticsearchServiceMock.createInternalClient();

    const hits = [
      {
        _id: 'agent1',
        _source: {
          active: true,

          access_api_key_id: 'pedTuHIBTEDt93wW0Fhr',
        },
      },
    ];

    mockEsClient.search.mockResolvedValue({
      body: {
        hits: {
          // @ts-expect-error
          hits,
        },
      },
    });
    expect(
      authenticateAgentWithAccessToken(mockEsClient, {
        auth: { isAuthenticated: true },
        headers: {
          authorization: 'aaaa',
        },
      } as KibanaRequest)
    ).rejects.toThrow(/Authorization header is malformed/);
  });

  it('should throw if the agent is not active', async () => {
    const mockEsClient = elasticsearchServiceMock.createInternalClient();

    const hits = [
      {
        _id: 'agent1',
        _source: {
          active: false,
          access_api_key_id: 'pedTuHIBTEDt93wW0Fhr',
        },
      },
    ];
    mockEsClient.search.mockResolvedValue({
      body: {
        hits: {
          // @ts-expect-error
          hits,
        },
      },
    });
    expect(
      authenticateAgentWithAccessToken(mockEsClient, {
        auth: { isAuthenticated: true },
        headers: {
          authorization: 'ApiKey cGVkVHVISUJURUR0OTN3VzBGaHI6TnU1U0JtbHJSeC12Rm9qQWpoSHlUZw==',
        },
      } as KibanaRequest)
    ).rejects.toThrow(/Agent inactive/);
  });

  it('should throw if there is no agent matching the API key', async () => {
    const mockEsClient = elasticsearchServiceMock.createInternalClient();

    mockEsClient.search.mockResolvedValue({
      body: {
        hits: {
          // @ts-expect-error
          hits: [],
        },
      },
    });
    expect(
      authenticateAgentWithAccessToken(mockEsClient, {
        auth: { isAuthenticated: true },
        headers: {
          authorization: 'ApiKey cGVkVHVISUJURUR0OTN3VzBGaHI6TnU1U0JtbHJSeC12Rm9qQWpoSHlUZw==',
        },
      } as KibanaRequest)
    ).rejects.toThrow(/Agent not found/);
  });
});
