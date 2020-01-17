/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IClusterClient, Logger } from '../../../../../src/core/server';
import { getErrorStatusCode } from '../errors';

/**
 * Represents a pair of access and refresh tokens.
 */
export interface TokenPair {
  /**
   * Access token issued as the result of successful authentication and that should be provided with
   * every request to Elasticsearch on behalf of the authenticated user. This token will eventually expire.
   */
  readonly accessToken: string;

  /**
   * Once access token expires the refresh token is used to get a new pair of access/refresh tokens
   * without any user involvement. If not used this token will eventually expire as well.
   */
  readonly refreshToken: string;
}

/**
 * Class responsible for managing access and refresh tokens (refresh, invalidate, etc.) used by
 * various authentication providers.
 */
export class Tokens {
  /**
   * Logger instance bound to `tokens` context.
   */
  private readonly logger: Logger;

  constructor(private readonly options: Readonly<{ client: IClusterClient; logger: Logger }>) {
    this.logger = options.logger;
  }

  /**
   * Tries to exchange provided refresh token to a new pair of access and refresh tokens.
   * @param existingRefreshToken Refresh token to send to the refresh token API.
   */
  public async refresh(existingRefreshToken: string): Promise<TokenPair | null> {
    try {
      // Token should be refreshed by the same user that obtained that token.
      const {
        access_token: accessToken,
        refresh_token: refreshToken,
      } = await this.options.client.callAsInternalUser('shield.getAccessToken', {
        body: { grant_type: 'refresh_token', refresh_token: existingRefreshToken },
      });

      this.logger.debug('Access token has been successfully refreshed.');

      return { accessToken, refreshToken };
    } catch (err) {
      this.logger.debug(`Failed to refresh access token: ${err.message}`);

      // There are at least two common cases when refresh token request can fail:
      // 1. Refresh token is valid only for 24 hours and if it hasn't been used it expires.
      //
      // 2. Refresh token is one-time use token and if it has been used already, it is treated in the same way as
      // expired token. Even though it's an edge case, there are several perfectly valid scenarios when it can
      // happen. E.g. when several simultaneous AJAX request has been sent to Kibana, but access token has expired
      // already, so the first request that reaches Kibana uses refresh token to get a new access token, but the
      // second concurrent request has no idea about that and tries to refresh access token as well. All ends well
      // when first request refreshes access token and updates session cookie with fresh access/refresh token pair.
      // But if user navigates to another page _before_ AJAX request (the one that triggered token refresh) responds
      // with updated cookie, then user will have only that old cookie with expired access token and refresh token
      // that has been used already.
      //
      // Even though the issue is solved to large extent by a predefined 60s window during which ES allows to use the
      // same refresh token multiple times yielding the same refreshed access/refresh token pair it's still possible
      // to hit the case when refresh token is no longer valid.
      if (getErrorStatusCode(err) === 400) {
        this.logger.debug('Refresh token is either expired or already used.');
        return null;
      }

      throw err;
    }
  }

  /**
   * Tries to invalidate provided access and refresh token pair. At least one of the tokens should
   * be specified.
   * @param [accessToken] Optional access token to invalidate.
   * @param [refreshToken] Optional refresh token to invalidate.
   */
  public async invalidate({ accessToken, refreshToken }: Partial<TokenPair>) {
    this.logger.debug('Invalidating access/refresh token pair.');

    let invalidationError;
    if (refreshToken) {
      let invalidatedTokensCount;
      try {
        invalidatedTokensCount = (
          await this.options.client.callAsInternalUser('shield.deleteAccessToken', {
            body: { refresh_token: refreshToken },
          })
        ).invalidated_tokens;
      } catch (err) {
        this.logger.debug(`Failed to invalidate refresh token: ${err.message}`);
        // We don't re-throw the error here to have a chance to invalidate access token if it's provided.
        invalidationError = err;
      }

      if (invalidatedTokensCount === 0) {
        this.logger.debug('Refresh token was already invalidated.');
      } else if (invalidatedTokensCount === 1) {
        this.logger.debug('Refresh token has been successfully invalidated.');
      } else if (invalidatedTokensCount > 1) {
        this.logger.debug(
          `${invalidatedTokensCount} refresh tokens were invalidated, this is unexpected.`
        );
      }
    }

    if (accessToken) {
      let invalidatedTokensCount;
      try {
        invalidatedTokensCount = (
          await this.options.client.callAsInternalUser('shield.deleteAccessToken', {
            body: { token: accessToken },
          })
        ).invalidated_tokens;
      } catch (err) {
        this.logger.debug(`Failed to invalidate access token: ${err.message}`);
        invalidationError = err;
      }

      if (invalidatedTokensCount === 0) {
        this.logger.debug('Access token was already invalidated.');
      } else if (invalidatedTokensCount === 1) {
        this.logger.debug('Access token has been successfully invalidated.');
      } else if (invalidatedTokensCount > 1) {
        this.logger.debug(
          `${invalidatedTokensCount} access tokens were invalidated, this is unexpected.`
        );
      }
    }

    if (invalidationError) {
      throw invalidationError;
    }
  }

  /**
   * Tries to determine whether specified error that occurred while trying to authenticate request
   * using access token happened because access token is expired. We treat all `401 Unauthorized`
   * as such. Another use case that we should temporarily support (until elastic/elasticsearch#38866
   * is fixed) is when token document has been removed and ES responds with `500 Internal Server Error`.
   * @param err Error returned from Elasticsearch.
   */
  public static isAccessTokenExpiredError(err?: any) {
    const errorStatusCode = getErrorStatusCode(err);
    return (
      errorStatusCode === 401 ||
      (errorStatusCode === 500 &&
        !!(
          err &&
          err.body &&
          err.body.error &&
          err.body.error.reason === 'token document is missing and must be present'
        ))
    );
  }
}
