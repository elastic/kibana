/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

import { getErrorStatusCode } from '../../errors';
import { AuthenticationResult } from '../authentication_result';
import { canRedirectRequest } from '../can_redirect_request';
import { DeauthenticationResult } from '../deauthentication_result';
import {
  BasicHTTPAuthorizationHeaderCredentials,
  HTTPAuthorizationHeader,
} from '../http_authentication';
import type { AuthenticationProviderOptions } from './base';
import { BaseAuthenticationProvider } from './base';

/**
 * Credentials that are based on the username and password.
 */
interface UsernameAndPasswordCredentials {
  username: string;
  password: string;
}

/**
 * Credentials that are based on the Elasticsearch API key.
 */
interface APIKeyCredentials {
  apiKey: { id: string; key: string } | string;
}

/**
 * Credentials that imply authentication based on the Elasticsearch native anonymous user.
 */
type ElasticsearchAnonymousUserCredentials = 'elasticsearch_anonymous_user';

/**
 * Checks whether current request can initiate a new session.
 * @param request Request instance.
 */
function canStartNewSession(request: KibanaRequest) {
  // We should try to establish new session only if request requires authentication and it's not XHR request.
  // Technically we can authenticate XHR requests too, but we don't want these to create a new session unintentionally.
  return canRedirectRequest(request) && request.route.options.authRequired === true;
}

/**
 * Checks whether specified `credentials` define an API key.
 * @param credentials
 */
function isAPIKeyCredentials(
  credentials:
    | ElasticsearchAnonymousUserCredentials
    | APIKeyCredentials
    | UsernameAndPasswordCredentials
): credentials is APIKeyCredentials {
  return !!(credentials as APIKeyCredentials).apiKey;
}

/**
 * Provider that supports anonymous request authentication.
 */
export class AnonymousAuthenticationProvider extends BaseAuthenticationProvider {
  /**
   * Type of the provider.
   */
  static readonly type = 'anonymous';

  /**
   * Defines HTTP authorization header that should be used to authenticate request. It isn't defined
   * if provider should rely on Elasticsearch native anonymous access.
   */
  private readonly httpAuthorizationHeader: HTTPAuthorizationHeader | null;

  /**
   * Create authorization header for the specified credentials. Returns `null` if credentials imply
   * Elasticsearch anonymous user.
   * @param credentials Credentials to create HTTP authorization header for.
   */
  public static createHTTPAuthorizationHeader(
    credentials: Readonly<
      ElasticsearchAnonymousUserCredentials | UsernameAndPasswordCredentials | APIKeyCredentials
    >
  ) {
    if (credentials === 'elasticsearch_anonymous_user') {
      return null;
    }

    if (isAPIKeyCredentials(credentials)) {
      return new HTTPAuthorizationHeader(
        'ApiKey',
        typeof credentials.apiKey === 'string'
          ? credentials.apiKey
          : new BasicHTTPAuthorizationHeaderCredentials(
              credentials.apiKey.id,
              credentials.apiKey.key
            ).toString()
      );
    }

    return new HTTPAuthorizationHeader(
      'Basic',
      new BasicHTTPAuthorizationHeaderCredentials(
        credentials.username,
        credentials.password
      ).toString()
    );
  }

  constructor(
    protected readonly options: Readonly<AuthenticationProviderOptions>,
    anonymousOptions?: Readonly<{
      credentials?: Readonly<
        ElasticsearchAnonymousUserCredentials | UsernameAndPasswordCredentials | APIKeyCredentials
      >;
    }>
  ) {
    super(options);

    const credentials = anonymousOptions?.credentials;
    if (!credentials) {
      throw new Error('Credentials must be specified');
    }

    if (credentials === 'elasticsearch_anonymous_user') {
      this.logger.debug(
        'Anonymous requests will be authenticated using Elasticsearch native anonymous user.'
      );
    } else if (isAPIKeyCredentials(credentials)) {
      this.logger.debug('Anonymous requests will be authenticated via API key.');
    } else {
      this.logger.debug('Anonymous requests will be authenticated via username and password.');
    }

    this.httpAuthorizationHeader =
      AnonymousAuthenticationProvider.createHTTPAuthorizationHeader(credentials);
  }

  /**
   * Performs initial login request.
   * @param request Request instance.
   * @param state Optional state value previously stored by the provider.
   */
  public async login(request: KibanaRequest, state?: unknown) {
    this.logger.debug('Trying to perform a login.');
    return this.authenticateViaAuthorizationHeader(request, state);
  }

  /**
   * Performs request authentication.
   * @param request Request instance.
   * @param state Optional state value previously stored by the provider.
   */
  public async authenticate(request: KibanaRequest, state?: unknown) {
    this.logger.debug(
      `Trying to authenticate user request to ${request.url.pathname}${request.url.search}.`
    );

    if (HTTPAuthorizationHeader.parseFromRequest(request) != null) {
      this.logger.debug('Cannot authenticate requests with `Authorization` header.');
      return AuthenticationResult.notHandled();
    }

    if (state || canStartNewSession(request)) {
      return this.authenticateViaAuthorizationHeader(request, state);
    }

    return AuthenticationResult.notHandled();
  }

  /**
   * Redirects user to the logged out page.
   * @param request Request instance.
   * @param state Optional state value previously stored by the provider.
   */
  public async logout(request: KibanaRequest, state?: unknown) {
    this.logger.debug(
      `Logout is initiated by request to ${request.url.pathname}${request.url.search}.`
    );

    // Having a `null` state means that provider was specifically called to do a logout, but when
    // session isn't defined then provider is just being probed whether or not it can perform logout.
    if (state === undefined) {
      return DeauthenticationResult.notHandled();
    }

    return DeauthenticationResult.redirectTo(this.options.urls.loggedOut(request));
  }

  /**
   * Returns HTTP authentication scheme (`Basic` or `ApiKey`) that's used within `Authorization`
   * HTTP header that provider attaches to all successfully authenticated requests to Elasticsearch.
   */
  public getHTTPAuthenticationScheme() {
    return this.httpAuthorizationHeader?.scheme.toLowerCase() ?? null;
  }

  /**
   * Tries to authenticate user request via configured credentials encoded into `Authorization` header.
   * @param request Request instance.
   * @param state State value previously stored by the provider.
   */
  private async authenticateViaAuthorizationHeader(request: KibanaRequest, state?: unknown) {
    const authHeaders = this.httpAuthorizationHeader
      ? { authorization: this.httpAuthorizationHeader.toString() }
      : ({} as Record<string, string>);
    try {
      const user = await this.getUser(request, authHeaders);
      this.logger.debug(
        `Request to ${request.url.pathname}${request.url.search} has been authenticated.`
      );
      // Create session only if it doesn't exist yet, otherwise keep it unchanged.
      return AuthenticationResult.succeeded(user, { authHeaders, state: state ? undefined : {} });
    } catch (err) {
      if (getErrorStatusCode(err) === 401) {
        if (!this.httpAuthorizationHeader) {
          this.logger.error(
            `Failed to authenticate anonymous request using Elasticsearch reserved anonymous user. Anonymous access may not be properly configured in Elasticsearch: ${err.message}`
          );
        } else if (this.httpAuthorizationHeader.scheme.toLowerCase() === 'basic') {
          this.logger.error(
            `Failed to authenticate anonymous request using provided username/password credentials. The user with the provided username may not exist or the password is wrong: ${err.message}`
          );
        } else {
          this.logger.error(
            `Failed to authenticate anonymous request using provided API key. The key may not exist or expired: ${err.message}`
          );
        }
      } else {
        this.logger.error(`Failed to authenticate request : ${err.message}`);
      }
      return AuthenticationResult.failed(err);
    }
  }
}
