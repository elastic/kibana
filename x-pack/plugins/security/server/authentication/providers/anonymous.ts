/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from '../../../../../../src/core/server';
import { AuthenticationResult } from '../authentication_result';
import { canRedirectRequest } from '../can_redirect_request';
import { DeauthenticationResult } from '../deauthentication_result';
import {
  BasicHTTPAuthorizationHeaderCredentials,
  HTTPAuthorizationHeader,
} from '../http_authentication';
import { AuthenticationProviderOptions, BaseAuthenticationProvider } from './base';

/**
 * Credentials that are based on the username and password.
 */
interface UsernameAndPasswordCredentials {
  username: string;
  password: string;
}

/**
 * Credentials that are based on the Elasticsearch API key with the optional username override.
 */
interface APIKeyCredentials {
  username?: string;
  apiKey: string;
}

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
  credentials: UsernameAndPasswordCredentials | APIKeyCredentials
): credentials is APIKeyCredentials {
  const apiKey = ((credentials as unknown) as Record<string, any>).apiKey;
  return typeof apiKey === 'string' && !!apiKey;
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
   * Specifies credentials that should be used to authenticate anonymous user.
   */
  private readonly credentials: Readonly<UsernameAndPasswordCredentials | APIKeyCredentials>;

  constructor(
    protected readonly options: Readonly<AuthenticationProviderOptions>,
    anonymousOptions?: Readonly<{
      credentials?: Readonly<UsernameAndPasswordCredentials | APIKeyCredentials>;
    }>
  ) {
    super(options);

    if (!anonymousOptions || !anonymousOptions.credentials) {
      throw new Error('Credentials must be specified');
    }
    this.credentials = anonymousOptions.credentials;
  }

  /**
   * Performs initial login request.
   * @param request Request instance.
   * @param state Optional state value previously stored by the provider.
   */
  public async login(request: KibanaRequest, state?: unknown) {
    this.logger.debug('Trying to perform a login.');

    // If authentication succeeded we should return some state to create a session, that will reuse for all subsequent
    // requests and anonymous user interactions with the Kibana.
    return isAPIKeyCredentials(this.credentials)
      ? await this.authenticateViaAPIKey(request, this.credentials, state)
      : await this.authenticateViaUsernameAndPassword(request, this.credentials, state);
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
      return isAPIKeyCredentials(this.credentials)
        ? await this.authenticateViaAPIKey(request, this.credentials, state)
        : await this.authenticateViaUsernameAndPassword(request, this.credentials, state);
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

    return DeauthenticationResult.redirectTo(this.options.urls.loggedOut);
  }

  /**
   * Returns HTTP authentication scheme (`Basic` or `ApiKey`) that's used within `Authorization`
   * HTTP header that provider attaches to all successfully authenticated requests to Elasticsearch.
   */
  public getHTTPAuthenticationScheme() {
    return isAPIKeyCredentials(this.credentials) ? 'apikey' : 'basic';
  }

  /**
   * Tries to authenticate user request via configured username and password.
   * @param request Request instance.
   * @param credentials Credentials based on the username and password.
   * @param state State value previously stored by the provider.
   */
  private async authenticateViaUsernameAndPassword(
    request: KibanaRequest,
    { username, password }: UsernameAndPasswordCredentials,
    state?: unknown
  ) {
    this.logger.debug('Trying to authenticate request via anonymous username and password.');

    try {
      const authHeaders = {
        authorization: new HTTPAuthorizationHeader(
          'Basic',
          new BasicHTTPAuthorizationHeaderCredentials(username, password).toString()
        ).toString(),
      };

      const user = await this.getUser(request, authHeaders);
      this.logger.debug(
        `Request to ${request.url.pathname}${request.url.search} has been authenticated.`
      );
      return AuthenticationResult.succeeded(user, {
        authHeaders,
        // Create session only if it doesn't exist yet, otherwise keep it unchanged.
        state: state ? undefined : {},
      });
    } catch (err) {
      this.logger.debug(
        `Failed to authenticate request via anonymous username and password: ${err.message}`
      );
      return AuthenticationResult.failed(err);
    }
  }

  /**
   * Tries to authenticate user in via configured api key.
   * @param request Request instance.
   * @param credentials Credentials based on the API key.
   * @param state State value previously stored by the provider.
   */
  private async authenticateViaAPIKey(
    request: KibanaRequest,
    { apiKey, username }: APIKeyCredentials,
    state?: unknown
  ) {
    this.logger.debug('Trying to authenticate request via API key.');

    const authHeaders = {
      authorization: new HTTPAuthorizationHeader('ApiKey', apiKey).toString(),
    };
    try {
      const user = await this.getUser(request, authHeaders);
      this.logger.debug(
        `Request to ${request.url.pathname}${request.url.search} has been authenticated.`
      );
      return AuthenticationResult.succeeded(username ? { ...user, username } : user, {
        authHeaders,
        // Create session only if it doesn't exist yet, otherwise keep it unchanged.
        state: state ? undefined : {},
      });
    } catch (err) {
      this.logger.debug(`Failed to authenticate request via API key: ${err.message}`);
      return AuthenticationResult.failed(err);
    }
  }
}
