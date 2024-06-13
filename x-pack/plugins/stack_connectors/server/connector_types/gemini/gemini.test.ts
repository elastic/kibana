/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GeminiConnector } from './gemini';
import { RunActionParams } from '../../../common/gemini/types';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { initDashboard } from '../lib/gen_ai/create_gen_ai_dashboard';
import { RunApiResponseSchema } from '../../../common/gemini/schema';

jest.mock('../lib/gen_ai/create_gen_ai_dashboard');
jest.mock('@kbn/actions-plugin/server/sub_action_framework/helpers/validators', () => ({
  assertURL: jest.fn(),
}));

// Mock the imported function
jest.mock('@kbn/actions-plugin/server/lib/get_gcp_oauth_access_token', () => ({
  getGoogleOAuthJwtAccessToken: jest.fn().mockResolvedValue('mock_access_token'),
}));

let mockRequest: jest.Mock;

describe('GeminiConnector', () => {
  const defaultResponse = {
    data: {
      candidates: [{ content: { parts: [{ text: 'Paris' }] } }],
      usageMetadata: { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
    },
  };

  const connectorResponse = {
    completion: 'Paris',
    usageMetadata: { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // @ts-expect-error
    mockRequest = connector.request = jest.fn().mockResolvedValue(defaultResponse);
  });

  const connector = new GeminiConnector({
    connector: { id: '1', type: '.gemini' },
    configurationUtilities: actionsConfigMock.create(),
    config: {
      apiUrl: 'https://api.gemini.com',
      defaultModel: 'gemini-1.5-pro-preview-0409',
      gcpRegion: 'us-central1',
      gcpProjectID: 'my-project-12345',
    },
    secrets: {
      credentialsJson: JSON.stringify({
        type: 'service_account',
        project_id: '',
        private_key_id: '',
        private_key: '-----BEGIN PRIVATE KEY----------END PRIVATE KEY-----\n',
        client_email: '',
        client_id: '',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: '',
      }),
    },
    logger: loggingSystemMock.createLogger(),
    services: actionsMock.createServices(),
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

      const response = await connector.runApi(runActionParams);

      // Assertions
      expect(mockRequest).toBeCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith({
        url: 'https://api.gemini.com/v1/projects/my-project-12345/locations/us-central1/publishers/google/models/test-model:generateContent',
        method: 'post',
        data: JSON.stringify({
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
        headers: {
          Authorization: 'Bearer mock_access_token',
          'Content-Type': 'application/json',
        },
        timeout: 60000,
        responseSchema: RunApiResponseSchema,
        signal: undefined,
      });

      expect(response).toEqual(connectorResponse);
    });
  });

  describe('Token dashboard', () => {
    const mockGenAi = initDashboard as jest.Mock;
    beforeEach(() => {
      // @ts-ignore
      connector.esClient.transport.request = mockRequest;
      mockRequest.mockResolvedValue({ has_all_requested: true });
      mockGenAi.mockResolvedValue({ success: true });
      jest.clearAllMocks();
    });
    it('the create dashboard API call returns available: true when user has correct permissions', async () => {
      const response = await connector.getDashboard({ dashboardId: '123' });
      expect(mockRequest).toBeCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith({
        path: '/_security/user/_has_privileges',
        method: 'POST',
        body: {
          index: [
            {
              names: ['.kibana-event-log-*'],
              allow_restricted_indices: true,
              privileges: ['read'],
            },
          ],
        },
      });
      expect(response).toEqual({ available: true });
    });
    it('the create dashboard API call returns available: false when user has correct permissions', async () => {
      mockRequest.mockResolvedValue({ has_all_requested: false });
      const response = await connector.getDashboard({ dashboardId: '123' });
      expect(mockRequest).toBeCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith({
        path: '/_security/user/_has_privileges',
        method: 'POST',
        body: {
          index: [
            {
              names: ['.kibana-event-log-*'],
              allow_restricted_indices: true,
              privileges: ['read'],
            },
          ],
        },
      });
      expect(response).toEqual({ available: false });
    });

    it('the create dashboard API call returns available: false when init dashboard fails', async () => {
      mockGenAi.mockResolvedValue({ success: false });
      const response = await connector.getDashboard({ dashboardId: '123' });
      expect(mockRequest).toBeCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith({
        path: '/_security/user/_has_privileges',
        method: 'POST',
        body: {
          index: [
            {
              names: ['.kibana-event-log-*'],
              allow_restricted_indices: true,
              privileges: ['read'],
            },
          ],
        },
      });
      expect(response).toEqual({ available: false });
    });
  });
});
