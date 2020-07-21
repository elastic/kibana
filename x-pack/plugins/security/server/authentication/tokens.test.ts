/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { errors } from 'elasticsearch';

import { elasticsearchServiceMock, loggingSystemMock } from '../../../../../src/core/server/mocks';

import {
  ILegacyClusterClient,
  LegacyElasticsearchErrorHelpers,
} from '../../../../../src/core/server';
import { Tokens } from './tokens';

describe('Tokens', () => {
  let tokens: Tokens;
  let mockClusterClient: jest.Mocked<ILegacyClusterClient>;
  beforeEach(() => {
    mockClusterClient = elasticsearchServiceMock.createLegacyClusterClient();

    const tokensOptions = {
      client: mockClusterClient,
      logger: loggingSystemMock.create().get(),
    };

    tokens = new Tokens(tokensOptions);
  });

  it('isAccessTokenExpiredError() returns `true` only if token expired', () => {
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
      LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error()),
      new errors.AuthenticationException(),
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
    for (const [description, failureReason] of [
      ['an unknown error', new Error('failed to delete token')],
      ['a 404 error without body', { statusCode: 404 }],
    ] as Array<[string, object]>) {
      it(`throws if call to delete access token responds with ${description}`, async () => {
        const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

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
          {
            body: { token: tokenPair.accessToken },
          }
        );
        expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith(
          'shield.deleteAccessToken',
          {
            body: { refresh_token: tokenPair.refreshToken },
          }
        );
      });

      it(`throws if call to delete refresh token responds with ${description}`, async () => {
        const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

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
          {
            body: { token: tokenPair.accessToken },
          }
        );
        expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith(
          'shield.deleteAccessToken',
          {
            body: { refresh_token: tokenPair.refreshToken },
          }
        );
      });
    }

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

    for (const [description, response] of [
      ['none of the tokens were invalidated', Promise.resolve({ invalidated_tokens: 0 })],
      [
        '404 error is returned',
        Promise.reject({ statusCode: 404, body: { invalidated_tokens: 0 } }),
      ],
    ] as Array<[string, Promise<any>]>) {
      it(`does not fail if ${description}`, async () => {
        const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

        mockClusterClient.callAsInternalUser.mockImplementation(() => response);

        await expect(tokens.invalidate(tokenPair)).resolves.toBe(undefined);

        expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledTimes(2);
        expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith(
          'shield.deleteAccessToken',
          {
            body: { token: tokenPair.accessToken },
          }
        );
        expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith(
          'shield.deleteAccessToken',
          {
            body: { refresh_token: tokenPair.refreshToken },
          }
        );
      });
    }

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
