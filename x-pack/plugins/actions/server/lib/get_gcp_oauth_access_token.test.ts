/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { connectorTokenClientMock } from './connector_token_client.mock';
import { loggingSystemMock } from '@kbn/core/server/mocks';

describe('getGoogleOAuthJwtAccessToken', () => {
  const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
  const credentialsJson = {
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
  };
  const connectorTokenClient = connectorTokenClientMock.create();
  const getGoogleOAuthJwtAccessTokenOptions = {
    connectorId: '123',
    logger,
    credentials: credentialsJson,
    connectorTokenClient,
  };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('should get access token successfully', async () => {
    connectorTokenClient.get.mockResolvedValueOnce({
      hasErrors: false,
      connectorToken: null,
    });

    jest.mock('google-auth-library', () => ({
      GoogleAuth: jest.fn().mockImplementation(() => ({
        getAccessToken: jest.fn().mockResolvedValue('mocked_access_token'), // Success case
      })),
    }));

    // Dynamically import the function after mocking
    const { getGoogleOAuthJwtAccessToken } = await import('./get_gcp_oauth_access_token');

    const accessToken = await getGoogleOAuthJwtAccessToken(getGoogleOAuthJwtAccessTokenOptions);
    expect(accessToken).toBe('mocked_access_token');
    expect(connectorTokenClient.updateOrReplace).toHaveBeenCalledWith(
      expect.objectContaining({
        connectorId: '123',
        token: null,
        newToken: 'mocked_access_token',
        deleteExisting: false,
        expiresInSec: 3500,
      })
    );
  });

  it('uses stored access token if it exists', async () => {
    const createdAt = new Date();
    createdAt.setHours(createdAt.getHours() - 1);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    connectorTokenClient.get.mockResolvedValueOnce({
      hasErrors: false,
      connectorToken: {
        id: '1',
        connectorId: '123',
        tokenType: 'access_token',
        token: 'testtokenvalue',
        createdAt: createdAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
    });
    // Dynamically import the function
    const { getGoogleOAuthJwtAccessToken } = await import('./get_gcp_oauth_access_token');

    const accessToken = await getGoogleOAuthJwtAccessToken(getGoogleOAuthJwtAccessTokenOptions);
    expect(accessToken).toEqual('testtokenvalue');
  });

  it('should get access token if token expires', async () => {
    connectorTokenClient.get.mockResolvedValueOnce({
      hasErrors: false,
      connectorToken: {
        id: '1',
        connectorId: '123',
        tokenType: 'access_token',
        token: 'testtokenvalue',
        createdAt: new Date('2021-01-01T08:00:00.000Z').toISOString(),
        expiresAt: new Date('2021-01-02T13:00:00.000Z').toISOString(),
      },
    });

    jest.mock('google-auth-library', () => ({
      GoogleAuth: jest.fn().mockImplementation(() => ({
        getAccessToken: jest.fn().mockResolvedValue('mocked_access_token'), // Success case
      })),
    }));

    // Dynamically import the function after mocking
    const { getGoogleOAuthJwtAccessToken } = await import('./get_gcp_oauth_access_token');
    const accessToken = await getGoogleOAuthJwtAccessToken(getGoogleOAuthJwtAccessTokenOptions);
    expect(accessToken).toBe('mocked_access_token');
    expect(connectorTokenClient.updateOrReplace).toHaveBeenCalledWith(
      expect.objectContaining({
        connectorId: '123',
        newToken: 'mocked_access_token',
        deleteExisting: false,
        expiresInSec: 3500,
      })
    );
  });

  it('logs warning when getting connector token fails', async () => {
    const mockError = new Error('Failed to fetch token');
    connectorTokenClient.get.mockRejectedValue(mockError); // Simulate failure
    jest.mock('google-auth-library', () => ({
      GoogleAuth: jest.fn().mockImplementation(() => ({
        getAccessToken: jest.fn().mockResolvedValue('mocked_access_token'), // Success case
      })),
    }));

    // Dynamically import the function after mocking
    const { getGoogleOAuthJwtAccessToken } = await import('./get_gcp_oauth_access_token');
    const accessToken = await getGoogleOAuthJwtAccessToken({
      connectorId: 'failing_connector',
      logger,
      credentials: credentialsJson,
      connectorTokenClient,
    });

    expect(accessToken).toBeDefined(); // Should still return a token (likely a new one)
    expect(logger.warn).toHaveBeenCalledWith(
      `Failed to get connector token for connectorId: failing_connector. Error: ${mockError.message}`
    );
  });

  it('throws an error when Google Auth fails', async () => {
    jest.mock('google-auth-library', () => ({
      GoogleAuth: jest.fn().mockImplementation(() => ({
        getAccessToken: jest.fn().mockRejectedValue(new Error('Google Auth Error')),
      })),
    }));

    connectorTokenClient.get.mockResolvedValue({ connectorToken: null, hasErrors: false });

    // Dynamically import the function after mocking
    const { getGoogleOAuthJwtAccessToken } = await import('./get_gcp_oauth_access_token');

    await expect(
      getGoogleOAuthJwtAccessToken({
        connectorId: 'test_connector',
        logger,
        credentials: {},
        connectorTokenClient,
      })
    ).rejects.toThrowError(
      'Unable to retrieve access token. Ensure the service account has the right permissions and the Vertex AI endpoint is enabled in the GCP project. Error: Google Auth Error'
    );

    expect(connectorTokenClient.updateOrReplace).not.toHaveBeenCalled(); // No update
  });
});
