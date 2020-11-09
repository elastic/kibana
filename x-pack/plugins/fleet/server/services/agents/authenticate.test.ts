/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'kibana/server';
import { savedObjectsClientMock } from 'src/core/server/mocks';

import { authenticateAgentWithAccessToken } from './authenticate';

describe('test agent autenticate services', () => {
  it('should succeed with a valid API key and an active agent', async () => {
    const mockSavedObjectsClient = savedObjectsClientMock.create();
    mockSavedObjectsClient.find.mockReturnValue(
      Promise.resolve({
        page: 1,
        per_page: 100,
        total: 1,
        saved_objects: [
          {
            id: 'agent1',
            type: 'agent',
            references: [],
            score: 0,
            attributes: {
              active: true,
              access_api_key_id: 'pedTuHIBTEDt93wW0Fhr',
            },
          },
        ],
      })
    );
    await authenticateAgentWithAccessToken(mockSavedObjectsClient, {
      auth: { isAuthenticated: true },
      headers: {
        authorization: 'ApiKey cGVkVHVISUJURUR0OTN3VzBGaHI6TnU1U0JtbHJSeC12Rm9qQWpoSHlUZw==',
      },
    } as KibanaRequest);
  });

  it('should throw if the request is not authenticated', async () => {
    const mockSavedObjectsClient = savedObjectsClientMock.create();
    mockSavedObjectsClient.find.mockReturnValue(
      Promise.resolve({
        page: 1,
        per_page: 100,
        total: 1,
        saved_objects: [
          {
            id: 'agent1',
            type: 'agent',
            references: [],
            score: 0,
            attributes: {
              active: true,
              access_api_key_id: 'pedTuHIBTEDt93wW0Fhr',
            },
          },
        ],
      })
    );
    expect(
      authenticateAgentWithAccessToken(mockSavedObjectsClient, {
        auth: { isAuthenticated: false },
        headers: {
          authorization: 'ApiKey cGVkVHVISUJURUR0OTN3VzBGaHI6TnU1U0JtbHJSeC12Rm9qQWpoSHlUZw==',
        },
      } as KibanaRequest)
    ).rejects.toThrow(/Request not authenticated/);
  });

  it('should throw if the ApiKey headers is malformed', async () => {
    const mockSavedObjectsClient = savedObjectsClientMock.create();
    mockSavedObjectsClient.find.mockReturnValue(
      Promise.resolve({
        page: 1,
        per_page: 100,
        total: 1,
        saved_objects: [
          {
            id: 'agent1',
            type: 'agent',
            references: [],
            score: 0,
            attributes: {
              active: false,
              access_api_key_id: 'pedTuHIBTEDt93wW0Fhr',
            },
          },
        ],
      })
    );
    expect(
      authenticateAgentWithAccessToken(mockSavedObjectsClient, {
        auth: { isAuthenticated: true },
        headers: {
          authorization: 'aaaa',
        },
      } as KibanaRequest)
    ).rejects.toThrow(/Authorization header is malformed/);
  });

  it('should throw if the agent is not active', async () => {
    const mockSavedObjectsClient = savedObjectsClientMock.create();
    mockSavedObjectsClient.find.mockReturnValue(
      Promise.resolve({
        page: 1,
        per_page: 100,
        total: 1,
        saved_objects: [
          {
            id: 'agent1',
            type: 'agent',
            references: [],
            score: 0,
            attributes: {
              active: false,
              access_api_key_id: 'pedTuHIBTEDt93wW0Fhr',
            },
          },
        ],
      })
    );
    expect(
      authenticateAgentWithAccessToken(mockSavedObjectsClient, {
        auth: { isAuthenticated: true },
        headers: {
          authorization: 'ApiKey cGVkVHVISUJURUR0OTN3VzBGaHI6TnU1U0JtbHJSeC12Rm9qQWpoSHlUZw==',
        },
      } as KibanaRequest)
    ).rejects.toThrow(/Agent inactive/);
  });

  it('should throw if there is no agent matching the API key', async () => {
    const mockSavedObjectsClient = savedObjectsClientMock.create();
    mockSavedObjectsClient.find.mockReturnValue(
      Promise.resolve({
        page: 1,
        per_page: 100,
        total: 1,
        saved_objects: [],
      })
    );
    expect(
      authenticateAgentWithAccessToken(mockSavedObjectsClient, {
        auth: { isAuthenticated: true },
        headers: {
          authorization: 'ApiKey cGVkVHVISUJURUR0OTN3VzBGaHI6TnU1U0JtbHJSeC12Rm9qQWpoSHlUZw==',
        },
      } as KibanaRequest)
    ).rejects.toThrow(/Agent not found/);
  });
});
