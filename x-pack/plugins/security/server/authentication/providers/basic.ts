/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from '../../../../../../src/core/server';
import { canRedirectRequest } from '../can_redirect_request';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';
import { BaseAuthenticationProvider } from './base';

/**
 * Describes the parameters that are required by the provider to process the initial login request.
 */
interface ProviderLoginAttempt {
  username: string;
  password: string;
}

/**
 * The state supported by the provider.
 */
interface ProviderState {
  /**
   * Content of the HTTP authorization header (`Basic base-64-of-username:password`) that is based
   * on user credentials used at login time and that should be provided with every request to the
   * Elasticsearch on behalf of the authenticated user.
   */
  authorization?: string;
}

/**
 * Provider that supports request authentication via Basic HTTP Authentication.
 */
export class BasicAuthenticationProvider extends BaseAuthenticationProvider {
  /**
   * Performs initial login request using username and password.
   * @param request Request instance.
   * @param attempt User credentials.
   * @param [state] Optional state object associated with the provider.
   */
  public async login(
    request: KibanaRequest,
    { username, password }: ProviderLoginAttempt,
    state?: ProviderState | null
  ) {
    this.logger.debug('Trying to perform a login.');

    const authHeaders = {
      authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
    };

    try {
      const user = await this.getUser(request, authHeaders);

      this.logger.debug('Login has been successfully performed.');
      return AuthenticationResult.succeeded(user, { authHeaders, state: authHeaders });
    } catch (err) {
      this.logger.debug(`Failed to perform a login: ${err.message}`);
      return AuthenticationResult.failed(err);
    }
  }

  /**
   * Performs request authentication using Basic HTTP Authentication.
   * @param request Request instance.
   * @param [state] Optional state object associated with the provider.
   */
  public async authenticate(request: KibanaRequest, state?: ProviderState | null) {
    this.logger.debug(`Trying to authenticate user request to ${request.url.path}.`);

    // try header-based auth
    const {
      authenticationResult: headerAuthResult,
      headerNotRecognized,
    } = await this.authenticateViaHeader(request);
    if (headerNotRecognized) {
      return headerAuthResult;
    }

    let authenticationResult = headerAuthResult;
    if (authenticationResult.notHandled() && state) {
      authenticationResult = await this.authenticateViaState(request, state);
    } else if (authenticationResult.notHandled() && canRedirectRequest(request)) {
      // If we couldn't handle authentication let's redirect user to the login page.
      const nextURL = encodeURIComponent(
        `${this.options.basePath.get(request)}${request.url.path}`
      );
      authenticationResult = AuthenticationResult.redirectTo(
        `${this.options.basePath.get(request)}/login?next=${nextURL}`
      );
    }

    return authenticationResult;
  }

  /**
   * Redirects user to the login page preserving query string parameters.
   * @param request Request instance.
   */
  public async logout(request: KibanaRequest) {
    // Query string may contain the path where logout has been called or
    // logout reason that login page may need to know.
    const queryString = request.url.search || `?msg=LOGGED_OUT`;
    return DeauthenticationResult.redirectTo(
      `${this.options.basePath.get(request)}/login${queryString}`
    );
  }

  /**
   * Validates whether request contains `Basic ***` Authorization header and just passes it
   * forward to Elasticsearch backend.
   * @param request Request instance.
   */
  private async authenticateViaHeader(request: KibanaRequest) {
    this.logger.debug('Trying to authenticate via header.');

    const authorization = request.headers.authorization;
    if (!authorization || typeof authorization !== 'string') {
      this.logger.debug('Authorization header is not presented.');
      return { authenticationResult: AuthenticationResult.notHandled() };
    }

    const authenticationSchema = authorization.split(/\s+/)[0];
    if (authenticationSchema.toLowerCase() !== 'basic') {
      this.logger.debug(`Unsupported authentication schema: ${authenticationSchema}`);
      return {
        authenticationResult: AuthenticationResult.notHandled(),
        headerNotRecognized: true,
      };
    }

    try {
      const user = await this.getUser(request);

      this.logger.debug('Request has been authenticated via header.');
      return { authenticationResult: AuthenticationResult.succeeded(user) };
    } catch (err) {
      this.logger.debug(`Failed to authenticate request via header: ${err.message}`);
      return { authenticationResult: AuthenticationResult.failed(err) };
    }
  }

  /**
   * Tries to extract authorization header from the state and adds it to the request before
   * it's forwarded to Elasticsearch backend.
   * @param request Request instance.
   * @param state State value previously stored by the provider.
   */
  private async authenticateViaState(request: KibanaRequest, { authorization }: ProviderState) {
    this.logger.debug('Trying to authenticate via state.');

    if (!authorization) {
      this.logger.debug('Access token is not found in state.');
      return AuthenticationResult.notHandled();
    }

    try {
      const authHeaders = { authorization };
      const user = await this.getUser(request, authHeaders);

      this.logger.debug('Request has been authenticated via state.');
      return AuthenticationResult.succeeded(user, { authHeaders });
    } catch (err) {
      this.logger.debug(`Failed to authenticate request via state: ${err.message}`);
      return AuthenticationResult.failed(err);
    }
  }
}
