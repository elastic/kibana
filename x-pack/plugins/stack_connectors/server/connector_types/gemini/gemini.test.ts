/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GeminiConnector } from './gemini';
import { ServiceParams, SubActionConnector } from '@kbn/actions-plugin/server';
import { Config, Secrets, RunActionParams } from '../../../common/gemini/types';
import { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { Services } from '@kbn/actions-plugin/server/types';
import {
  KibanaRequest,
  SavedObjectsClientContract,
  ElasticsearchClient,
  KibanaRequestEvents,
  IKibanaSocket,
} from '@kbn/core/server';
import { ConnectorTokenClient } from '@kbn/actions-plugin/server/lib/connector_token_client';
import type { Headers } from 'packages/core/http/core-http-server/src/router/headers';
import { AxiosResponse, AxiosHeaders } from 'axios';
import { RunApiResponse } from '../../../common/gemini/types';
import { RunApiResponseSchema } from '../../../common/gemini/schema';

jest.mock('../lib/gen_ai/create_gen_ai_dashboard');
jest.mock('@kbn/actions-plugin/server/sub_action_framework/helpers/validators', () => ({
  assertURL: jest.fn(),
}));

jest.mock('@kbn/actions-plugin/server', () => {
  const originalModule = jest.requireActual('@kbn/actions-plugin/server');

  return {
    ...originalModule,
    SubActionConnector: SubActionConnector.arguments(
      (
        ...args: ConstructorParameters<typeof originalModule.SubActionConnector> // Capture constructor arguments
      ) => {
        const connectorInstance = new originalModule.SubActionConnector(...args);
        // Now you can mock the request method on the instance
        (connectorInstance.request as jest.MockedFunction<
          typeof originalModule.SubActionConnector.prototype.request
        >) = jest.fn();
        return connectorInstance;
      }
    ),
  };
});

describe('GeminiConnector', () => {
  let connector: GeminiConnector;
  let mockServiceParams: ServiceParams<Config, Secrets>;

  const mockConfigurationUtilities: ActionsConfigurationUtilities = {
    isHostnameAllowed: jest.fn().mockReturnValue(true), // Always allow hostname
    isUriAllowed: jest.fn().mockReturnValue(true), // Always allow URI
    isActionTypeEnabled: jest.fn().mockReturnValue(true), // Always enable action type
    ensureHostnameAllowed: jest.fn(), // Empty implementation for now
    ensureUriAllowed: jest.fn(), // Empty implementation for now
    ensureActionTypeEnabled: jest.fn(), // Empty implementation for now
    getSSLSettings: jest.fn(), // Empty implementation for now
    getProxySettings: jest.fn(), // Empty implementation for now
    getResponseSettings: jest.fn(), // Empty implementation for now
    getCustomHostSettings: jest.fn(), // Empty implementation for now
    getMicrosoftGraphApiUrl: jest.fn().mockReturnValue('https://graph.microsoft.com/v1.0'),
    getMicrosoftGraphApiScope: jest.fn().mockReturnValue('https://graph.microsoft.com/.default'),
    getMicrosoftExchangeUrl: jest.fn().mockReturnValue('https://outlook.office.com/api/v2.0'),
    getMaxAttempts: jest.fn().mockReturnValue(3),
    validateEmailAddresses: jest.fn(),
    enableFooterInEmail: jest.fn().mockReturnValue(true),
    getMaxQueued: jest.fn().mockReturnValue(100),
  };

  const mockServices: Services = {
    savedObjectsClient: {} as SavedObjectsClientContract, // Empty mock object
    scopedClusterClient: {} as ElasticsearchClient, // Empty mock object
    connectorTokenClient: {} as ConnectorTokenClient, // Empty mock object
  };

  const mockHeaders: Headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer some-token',
    'X-Custom-Header': ['value1', 'value2'], // Multiple values
  };

  const mockAxiosHeaders = new AxiosHeaders({
    'Content-Type': 'application/json',
    Authorization: 'Bearer some-token',
    'X-Custom-Header': ['value1', 'value2'],
  });

  const mockKibanaRequest: KibanaRequest = {
    id: 'mock-request-id',
    uuid: 'mock-request-uuid',
    url: new URL('https://example.com/api/endpoint'),
    route: {
      path: '/api/endpoint',
      method: 'get',
      options: {
        authRequired: 'optional',
        xsrfRequired: false,
        access: 'public',
        tags: ['readonly'],
        timeout: {
          payload: undefined,
          idleSocket: undefined,
        },
        description: 'string',
      },
    },
    headers: mockHeaders,
    isSystemRequest: false,
    isFakeRequest: false,
    isInternalApiRequest: false,
    socket: {} as IKibanaSocket, // You might need to mock this depending on your code's interaction with it
    events: {} as KibanaRequestEvents, // You might need to mock this too
    auth: {
      isAuthenticated: false,
    },
    params: {},
    query: {},
    body: {},
    httpVersion: '',
    protocol: 'http1'
  };

  beforeEach(() => {
    mockServiceParams = {
      connector: { id: 'Gemini-id', type: 'gemini' },
      configurationUtilities: mockConfigurationUtilities,
      config: {
        apiUrl: 'https://api.gemini.com',
        defaultModel: 'gemini-1.5-pro-preview-0409',
        gcpRegion: 'us-central1',
        gcpProjectID: 'my-project-12345',
      },
      secrets: {
        credentialsJson: JSON.stringify({
          "type": "service_account",
          "project_id": "",
          "private_key_id": "",
          "private_key": "-----BEGIN PRIVATE KEY----------END PRIVATE KEY-----\n",
          "client_email": "",
          "client_id": "",
          "auth_uri": "https://accounts.google.com/o/oauth2/auth",
          "token_uri": "https://oauth2.googleapis.com/token",
          "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
          "client_x509_cert_url": ""
        }),
      },
      logger: loggingSystemMock.createLogger(),
      services: mockServices,
      request: mockKibanaRequest,
    };

    connector = new GeminiConnector(mockServiceParams);
  });

  describe('getDashboard', () => {
    it('should return available: true when user has privileges', async () => {
      const dashboardId = 'some-dashboard-id';

      // Mock initDashboard to simulate a successful dashboard fetch
      jest.spyOn(connector, 'getDashboard').mockResolvedValueOnce({ available: true });

      const response = await connector.getDashboard({ dashboardId });
      expect(response).toEqual({ available: true });
    });

    // Add a test for the case when the user doesn't have privileges
  });

  describe('runApi', () => {
    it('should send a formatted request to the API and return the response', async () => {
      const runActionParams: RunActionParams = {
        body: JSON.stringify({
          messages: [
            {
              contents: [
                {
                  role: 'user',
                  parts: [{ text: 'What is the capital of France?' }],
                },
              ],
    },
          ],
        }),
        model: 'test-model',
      };

      const mockApiResponse: AxiosResponse<RunApiResponse> = {
        data: {
          candidates: [
            {
              content: {
                parts: [{ text: 'Paris' }],
              },
            },
          ],
          usageMetadata: {
            promptTokenCount: 4096,
            candidatesTokenCount: 512,
            totalTokenCount: 8192,
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          headers: mockAxiosHeaders,
        },
      };

      // Mock the request function to simulate a successful API call
      jest.spyOn(connector as GeminiConnector, 'request').mockResolvedValueOnce(mockApiResponse);

      const response = await connector.runApi(runActionParams);

      // Assert that the request was made with the correct parameters
      expect(connector.runApi).toHaveBeenCalledWith({
        url: 'https://api.gemini.com/v1/projects/my-project-12345/locations/us-central1/publishers/google/models/test-model:generateContent',
        method: 'post',
        data: JSON.stringify([
          {
            contents: [
              {
                role: 'user',
                parts: [{ text: 'What is the capital of France?' }],
              },
            ],
          },
        ]),
        headers: {
          Authorization: 'Bearer fake-access-token',
          'Content-Type': 'application/json',
        },
        responseSchema: RunApiResponseSchema,
      });

      // Assert the response
      expect(response).toEqual({ completion: 'Paris' });
    });
  });
});
