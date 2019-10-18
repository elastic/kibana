/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { errors } from 'elasticsearch';

import { elasticsearchServiceMock, loggingServiceMock } from '../../../../../src/core/server/mocks';

import { IClusterClient, ElasticsearchErrorHelpers } from '../../../../../src/core/server';
import { Tokens } from './tokens';

describe('Tokens', () => {
  let tokens: Tokens;
  let mockClusterClient: jest.Mocked<IClusterClient>;
  beforeEach(() => {
    mockClusterClient = elasticsearchServiceMock.createClusterClient();

    const tokensOptions = {
      client: mockClusterClient,
      logger: loggingServiceMock.create().get(),
    };

    tokens = new Tokens(tokensOptions);
  });

  it('isAccessTokenExpiredError() returns `true` only if token expired or its document is missing', () => {
    const nonExpirationErrors = [
      {},
      new Error(),
      new errors.InternalServerError(),
      new errors.Forbidden(),
      { statusCode: 500, body: { error: { reason: 'some unknown reason' } } },
    ];
    for (const error of nonExpirationErrors) {
      expect(Tokens.isAccessTokenExpiredError(error)).toBe(false);
    }

    const expirationErrors = [
      { statusCode: 401 },
      ElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error()),
      new errors.AuthenticationException(),
      {
        statusCode: 500,
        body: { error: { reason: 'token document is missing and must be present' } },
      },
    ];
    for (const error of expirationErrors) {
      expect(Tokens.isAccessTokenExpiredError(error)).toBe(true);
    }
  });

  describe('refresh()', () => {
    const refreshToken = 'some-refresh-token';

    it('throws if API call fails with unknown reason', async () => {
      const refreshFailureReason = new errors.ServiceUnavailable('Server is not available');
      mockClusterClient.callAsInternalUser.mockRejectedValue(refreshFailureReason);

      await expect(tokens.refresh(refreshToken)).rejects.toBe(refreshFailureReason);

      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith('shield.getAccessToken', {
        body: { grant_type: 'refresh_token', refresh_token: refreshToken },
      });
    });

    it('returns `null` if refresh token is not valid', async () => {
      const refreshFailureReason = new errors.BadRequest();
      mockClusterClient.callAsInternalUser.mockRejectedValue(refreshFailureReason);

      await expect(tokens.refresh(refreshToken)).resolves.toBe(null);

      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith('shield.getAccessToken', {
        body: { grant_type: 'refresh_token', refresh_token: refreshToken },
      });
    });

    it('returns token pair if refresh API call succeeds', async () => {
      const tokenPair = { accessToken: 'access-token', refreshToken: 'refresh-token' };
      mockClusterClient.callAsInternalUser.mockResolvedValue({
        access_token: tokenPair.accessToken,
        refresh_token: tokenPair.refreshToken,
      });

      await expect(tokens.refresh(refreshToken)).resolves.toEqual(tokenPair);

      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith('shield.getAccessToken', {
        body: { grant_type: 'refresh_token', refresh_token: refreshToken },
      });
    });
  });

  describe('invalidate()', () => {
    it('throws if call to delete access token responds with an error', async () => {
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      const failureReason = new Error('failed to delete token');
      mockClusterClient.callAsInternalUser.mockImplementation((methodName, args: any) => {
        if (args && args.body && args.body.token) {
          return Promise.reject(failureReason);
        }

        return Promise.resolve({ invalidated_tokens: 1 });
      });

      await expect(tokens.invalidate(tokenPair)).rejects.toBe(failureReason);

      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledTimes(2);
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith(
        'shield.deleteAccessToken',
        { body: { token: tokenPair.accessToken } }
      );
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith(
        'shield.deleteAccessToken',
        { body: { refresh_token: tokenPair.refreshToken } }
      );
    });

    it('throws if call to delete refresh token responds with an error', async () => {
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      const failureReason = new Error('failed to delete token');
      mockClusterClient.callAsInternalUser.mockImplementation((methodName, args: any) => {
        if (args && args.body && args.body.refresh_token) {
          return Promise.reject(failureReason);
        }

        return Promise.resolve({ invalidated_tokens: 1 });
      });

      await expect(tokens.invalidate(tokenPair)).rejects.toBe(failureReason);

      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledTimes(2);
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith(
        'shield.deleteAccessToken',
        { body: { token: tokenPair.accessToken } }
      );
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith(
        'shield.deleteAccessToken',
        { body: { refresh_token: tokenPair.refreshToken } }
      );
    });

    it('invalidates all provided tokens', async () => {
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      mockClusterClient.callAsInternalUser.mockResolvedValue({ invalidated_tokens: 1 });

      await expect(tokens.invalidate(tokenPair)).resolves.toBe(undefined);

      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledTimes(2);
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith(
        'shield.deleteAccessToken',
        { body: { token: tokenPair.accessToken } }
      );
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith(
        'shield.deleteAccessToken',
        { body: { refresh_token: tokenPair.refreshToken } }
      );
    });

    it('invalidates only access token if only access token is provided', async () => {
      const tokenPair = { accessToken: 'foo' };

      mockClusterClient.callAsInternalUser.mockResolvedValue({ invalidated_tokens: 1 });

      await expect(tokens.invalidate(tokenPair)).resolves.toBe(undefined);

      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith(
        'shield.deleteAccessToken',
        { body: { token: tokenPair.accessToken } }
      );
    });

    it('invalidates only refresh token if only refresh token is provided', async () => {
      const tokenPair = { refreshToken: 'foo' };

      mockClusterClient.callAsInternalUser.mockResolvedValue({ invalidated_tokens: 1 });

      await expect(tokens.invalidate(tokenPair)).resolves.toBe(undefined);

      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith(
        'shield.deleteAccessToken',
        { body: { refresh_token: tokenPair.refreshToken } }
      );
    });

    it('does not fail if none of the tokens were invalidated', async () => {
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      mockClusterClient.callAsInternalUser.mockResolvedValue({ invalidated_tokens: 0 });

      await expect(tokens.invalidate(tokenPair)).resolves.toBe(undefined);

      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledTimes(2);
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith(
        'shield.deleteAccessToken',
        { body: { token: tokenPair.accessToken } }
      );
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith(
        'shield.deleteAccessToken',
        { body: { refresh_token: tokenPair.refreshToken } }
      );
    });

    it('does not fail if more than one token per access or refresh token were invalidated', async () => {
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      mockClusterClient.callAsInternalUser.mockResolvedValue({ invalidated_tokens: 5 });

      await expect(tokens.invalidate(tokenPair)).resolves.toBe(undefined);

      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledTimes(2);
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith(
        'shield.deleteAccessToken',
        { body: { token: tokenPair.accessToken } }
      );
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith(
        'shield.deleteAccessToken',
        { body: { refresh_token: tokenPair.refreshToken } }
      );
    });
  });
});
