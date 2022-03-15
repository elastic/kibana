/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';

import { elasticsearchServiceMock, loggingSystemMock } from 'src/core/server/mocks';

import { mockAuthenticatedUser } from '../../common/model/authenticated_user.mock';
import { securityMock } from '../mocks';
import { Tokens } from './tokens';

describe('Tokens', () => {
  let tokens: Tokens;
  let mockElasticsearchClient: ReturnType<
    typeof elasticsearchServiceMock.createElasticsearchClient
  >;
  beforeEach(() => {
    mockElasticsearchClient = elasticsearchServiceMock.createElasticsearchClient();

    const tokensOptions = {
      client: mockElasticsearchClient,
      logger: loggingSystemMock.create().get(),
    };

    tokens = new Tokens(tokensOptions);
  });

  it('isAccessTokenExpiredError() returns `true` only if token expired', () => {
    const nonExpirationErrors = [
      {},
      new Error(),
      new errors.NoLivingConnectionsError(
        'Server is not available',
        securityMock.createApiResponse({ body: {} })
      ),
      new errors.ResponseError(
        securityMock.createApiResponse({
          statusCode: 403,
          body: { error: { reason: 'forbidden' } },
        })
      ),
      { statusCode: 500, body: { error: { reason: 'some unknown reason' } } },
      new errors.NoLivingConnectionsError(
        'Server is not available',
        securityMock.createApiResponse({
          statusCode: 500,
          body: { error: { reason: 'some unknown reason' } },
        })
      ),
    ];
    for (const error of nonExpirationErrors) {
      expect(Tokens.isAccessTokenExpiredError(error)).toBe(false);
    }

    const expirationErrors = [
      { statusCode: 401 },
      securityMock.createApiResponse({
        statusCode: 401,
        body: { error: { reason: 'unauthenticated' } },
      }),
    ];
    for (const error of expirationErrors) {
      expect(Tokens.isAccessTokenExpiredError(error)).toBe(true);
    }
  });

  describe('refresh()', () => {
    const refreshToken = 'some-refresh-token';

    it('throws if API call fails with unknown reason', async () => {
      const refreshFailureReason = new errors.NoLivingConnectionsError(
        'Server is not available',
        securityMock.createApiResponse({ body: {} })
      );
      mockElasticsearchClient.security.getToken.mockRejectedValue(refreshFailureReason);

      await expect(tokens.refresh(refreshToken)).rejects.toBe(refreshFailureReason);

      expect(mockElasticsearchClient.security.getToken).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.security.getToken).toHaveBeenCalledWith({
        body: { grant_type: 'refresh_token', refresh_token: refreshToken },
      });
    });

    it('returns `null` if refresh token is not valid', async () => {
      const refreshFailureReason = new errors.ResponseError(
        securityMock.createApiResponse({ statusCode: 400, body: {} })
      );
      mockElasticsearchClient.security.getToken.mockRejectedValue(refreshFailureReason);

      await expect(tokens.refresh(refreshToken)).resolves.toBe(null);

      expect(mockElasticsearchClient.security.getToken).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.security.getToken).toHaveBeenCalledWith({
        body: { grant_type: 'refresh_token', refresh_token: refreshToken },
      });
    });

    it('returns token pair if refresh API call succeeds', async () => {
      const authenticationInfo = mockAuthenticatedUser();
      const tokenPair = { accessToken: 'access-token', refreshToken: 'refresh-token' };
      mockElasticsearchClient.security.getToken.mockResponse({
        access_token: tokenPair.accessToken,
        refresh_token: tokenPair.refreshToken,
        authentication: authenticationInfo,
        type: 'Bearer',
        expires_in: 1200,
        scope: 'FULL',
      });

      await expect(tokens.refresh(refreshToken)).resolves.toEqual({
        authenticationInfo,
        ...tokenPair,
      });

      expect(mockElasticsearchClient.security.getToken).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.security.getToken).toHaveBeenCalledWith({
        body: { grant_type: 'refresh_token', refresh_token: refreshToken },
      });
    });
  });

  describe('invalidate()', () => {
    for (const [description, failureReason] of [
      [
        'an unknown error',
        new errors.ResponseError(
          securityMock.createApiResponse(
            securityMock.createApiResponse({ body: { message: 'failed to delete token' } })
          )
        ),
      ],
      [
        'a 404 error without body',
        new errors.ResponseError(
          securityMock.createApiResponse(
            securityMock.createApiResponse({ statusCode: 404, body: {} })
          )
        ),
      ],
    ] as Array<[string, object]>) {
      it(`throws if call to delete access token responds with ${description}`, async () => {
        const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

        mockElasticsearchClient.security.invalidateToken.mockImplementation((args: any) => {
          if (args && args.body && args.body.token) {
            return Promise.reject(failureReason) as any;
          }

          return Promise.resolve(
            securityMock.createApiResponse({ body: { invalidated_tokens: 1 } })
          ) as any;
        });

        await expect(tokens.invalidate(tokenPair)).rejects.toBe(failureReason);

        expect(mockElasticsearchClient.security.invalidateToken).toHaveBeenCalledTimes(2);
        expect(mockElasticsearchClient.security.invalidateToken).toHaveBeenCalledWith({
          body: { token: tokenPair.accessToken },
        });
        expect(mockElasticsearchClient.security.invalidateToken).toHaveBeenCalledWith({
          body: { refresh_token: tokenPair.refreshToken },
        });
      });

      it(`throws if call to delete refresh token responds with ${description}`, async () => {
        const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

        mockElasticsearchClient.security.invalidateToken.mockImplementation((args: any) => {
          if (args && args.body && args.body.refresh_token) {
            return Promise.reject(failureReason) as any;
          }

          return Promise.resolve(
            securityMock.createApiResponse({ body: { invalidated_tokens: 1 } })
          ) as any;
        });

        await expect(tokens.invalidate(tokenPair)).rejects.toBe(failureReason);

        expect(mockElasticsearchClient.security.invalidateToken).toHaveBeenCalledTimes(2);
        expect(mockElasticsearchClient.security.invalidateToken).toHaveBeenCalledWith({
          body: { token: tokenPair.accessToken },
        });
        expect(mockElasticsearchClient.security.invalidateToken).toHaveBeenCalledWith({
          body: { refresh_token: tokenPair.refreshToken },
        });
      });
    }

    it('invalidates all provided tokens', async () => {
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      mockElasticsearchClient.security.invalidateToken.mockResponse({
        invalidated_tokens: 1,
        previously_invalidated_tokens: 0,
        error_count: 0,
        error_details: [],
      });

      await expect(tokens.invalidate(tokenPair)).resolves.toBe(undefined);

      expect(mockElasticsearchClient.security.invalidateToken).toHaveBeenCalledTimes(2);
      expect(mockElasticsearchClient.security.invalidateToken).toHaveBeenCalledWith({
        body: { token: tokenPair.accessToken },
      });
      expect(mockElasticsearchClient.security.invalidateToken).toHaveBeenCalledWith({
        body: { refresh_token: tokenPair.refreshToken },
      });
    });

    it('invalidates only access token if only access token is provided', async () => {
      const tokenPair = { accessToken: 'foo' };

      mockElasticsearchClient.security.invalidateToken.mockResponse({
        invalidated_tokens: 1,
        previously_invalidated_tokens: 0,
        error_count: 0,
        error_details: [],
      });

      await expect(tokens.invalidate(tokenPair)).resolves.toBe(undefined);

      expect(mockElasticsearchClient.security.invalidateToken).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.security.invalidateToken).toHaveBeenCalledWith({
        body: { token: tokenPair.accessToken },
      });
    });

    it('invalidates only refresh token if only refresh token is provided', async () => {
      const tokenPair = { refreshToken: 'foo' };

      mockElasticsearchClient.security.invalidateToken.mockResponse({
        invalidated_tokens: 1,
        previously_invalidated_tokens: 0,
        error_count: 0,
        error_details: [],
      });

      await expect(tokens.invalidate(tokenPair)).resolves.toBe(undefined);

      expect(mockElasticsearchClient.security.invalidateToken).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.security.invalidateToken).toHaveBeenCalledWith({
        body: { refresh_token: tokenPair.refreshToken },
      });
    });

    for (const [description, response] of [
      [
        'none of the tokens were invalidated',
        Promise.resolve(securityMock.createApiResponse({ body: { invalidated_tokens: 0 } })),
      ],
      [
        '404 error is returned',
        Promise.resolve(
          securityMock.createApiResponse({ statusCode: 404, body: { invalidated_tokens: 0 } })
        ),
      ],
    ] as Array<[string, any]>) {
      it(`does not fail if ${description}`, async () => {
        const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

        mockElasticsearchClient.security.invalidateToken.mockImplementation(() => response);

        await expect(tokens.invalidate(tokenPair)).resolves.toBe(undefined);

        expect(mockElasticsearchClient.security.invalidateToken).toHaveBeenCalledTimes(2);
        expect(mockElasticsearchClient.security.invalidateToken).toHaveBeenCalledWith({
          body: { token: tokenPair.accessToken },
        });
        expect(mockElasticsearchClient.security.invalidateToken).toHaveBeenCalledWith({
          body: { refresh_token: tokenPair.refreshToken },
        });
      });
    }

    it('does not fail if more than one token per access or refresh token were invalidated', async () => {
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      mockElasticsearchClient.security.invalidateToken.mockResponse({
        invalidated_tokens: 5,
        previously_invalidated_tokens: 0,
        error_count: 0,
        error_details: [],
      });

      await expect(tokens.invalidate(tokenPair)).resolves.toBe(undefined);

      expect(mockElasticsearchClient.security.invalidateToken).toHaveBeenCalledTimes(2);
      expect(mockElasticsearchClient.security.invalidateToken).toHaveBeenCalledWith({
        body: { token: tokenPair.accessToken },
      });
      expect(mockElasticsearchClient.security.invalidateToken).toHaveBeenCalledWith({
        body: { refresh_token: tokenPair.refreshToken },
      });
    });
  });
});
