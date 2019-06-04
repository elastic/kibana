/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable max-classes-per-file */

import { Legacy } from 'kibana';
import { canRedirectRequest } from '../../can_redirect_request';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';
import { BaseAuthenticationProvider, RequestWithLoginAttempt } from './base';

/**
 * Utility class that knows how to decorate request with proper Basic authentication headers.
 */
export class BasicCredentials {
  /**
   * Takes provided `username` and `password`, transforms them into proper `Basic ***` authorization
   * header and decorates passed request with it.
   * @param request Request instance.
   * @param username User name.
   * @param password User password.
   */
  public static decorateRequest<T extends RequestWithLoginAttempt>(
    request: T,
    username: string,
    password: string
  ) {
    const typeOfRequest = typeof request;
    if (!request || typeOfRequest !== 'object') {
      throw new Error('Request should be a valid object.');
    }

    if (!username || typeof username !== 'string') {
      throw new Error('Username should be a valid non-empty string.');
    }

    if (!password || typeof password !== 'string') {
      throw new Error('Password should be a valid non-empty string.');
    }

    const basicCredentials = Buffer.from(`${username}:${password}`).toString('base64');
    request.headers.authorization = `Basic ${basicCredentials}`;
    return request;
  }
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
   * Performs request authentication using Basic HTTP Authentication.
   * @param request Request instance.
   * @param [state] Optional state object associated with the provider.
   */
  public async authenticate(request: RequestWithLoginAttempt, state?: ProviderState | null) {
    this.debug(`Trying to authenticate user request to ${request.url.path}.`);

    // first try from login payload
    let authenticationResult = await this.authenticateViaLoginAttempt(request);

    // if there isn't a payload, try header-based auth
    if (authenticationResult.notHandled()) {
      const {
        authenticationResult: headerAuthResult,
        headerNotRecognized,
      } = await this.authenticateViaHeader(request);
      if (headerNotRecognized) {
        return headerAuthResult;
      }
      authenticationResult = headerAuthResult;
    }

    if (authenticationResult.notHandled() && state) {
      authenticationResult = await this.authenticateViaState(request, state);
    } else if (authenticationResult.notHandled() && canRedirectRequest(request)) {
      // If we couldn't handle authentication let's redirect user to the login page.
      const nextURL = encodeURIComponent(`${request.getBasePath()}${request.url.path}`);
      authenticationResult = AuthenticationResult.redirectTo(
        `${this.options.basePath}/login?next=${nextURL}`
      );
    }

    return authenticationResult;
  }

  /**
   * Redirects user to the login page preserving query string parameters.
   * @param request Request instance.
   */
  public async deauthenticate(request: Legacy.Request) {
    // Query string may contain the path where logout has been called or
    // logout reason that login page may need to know.
    const queryString = request.url.search || `?msg=LOGGED_OUT`;
    return DeauthenticationResult.redirectTo(`${this.options.basePath}/login${queryString}`);
  }

  /**
   * Validates whether request contains a login payload and authenticates the
   * user if necessary.
   * @param request Request instance.
   */
  private async authenticateViaLoginAttempt(request: RequestWithLoginAttempt) {
    this.debug('Trying to authenticate via login attempt.');

    const credentials = request.loginAttempt().getCredentials();
    if (!credentials) {
      this.debug('Username and password not found in payload.');
      return AuthenticationResult.notHandled();
    }

    try {
      const { username, password } = credentials;
      BasicCredentials.decorateRequest(request, username, password);
      const user = await this.options.client.callWithRequest(request, 'shield.authenticate');
      this.debug('Request has been authenticated via login attempt.');
      return AuthenticationResult.succeeded(user, { authorization: request.headers.authorization });
    } catch (err) {
      this.debug(`Failed to authenticate request via login attempt: ${err.message}`);
      // Reset `Authorization` header we've just set. We know for sure that it hasn't been defined before,
      // otherwise it would have been used or completely rejected by the `authenticateViaHeader`.
      // We can't just set `authorization` to `undefined` or `null`, we should remove this property
      // entirely, otherwise `authorization` header without value will cause `callWithRequest` to fail if
      // it's called with this request once again down the line (e.g. in the next authentication provider).
      delete request.headers.authorization;
      return AuthenticationResult.failed(err);
    }
  }

  /**
   * Validates whether request contains `Basic ***` Authorization header and just passes it
   * forward to Elasticsearch backend.
   * @param request Request instance.
   */
  private async authenticateViaHeader(request: RequestWithLoginAttempt) {
    this.debug('Trying to authenticate via header.');

    const authorization = request.headers.authorization;
    if (!authorization) {
      this.debug('Authorization header is not presented.');
      return { authenticationResult: AuthenticationResult.notHandled() };
    }

    const authenticationSchema = authorization.split(/\s+/)[0];
    if (authenticationSchema.toLowerCase() !== 'basic') {
      this.debug(`Unsupported authentication schema: ${authenticationSchema}`);
      return {
        authenticationResult: AuthenticationResult.notHandled(),
        headerNotRecognized: true,
      };
    }

    try {
      const user = await this.options.client.callWithRequest(request, 'shield.authenticate');

      this.debug('Request has been authenticated via header.');

      return { authenticationResult: AuthenticationResult.succeeded(user) };
    } catch (err) {
      this.debug(`Failed to authenticate request via header: ${err.message}`);
      return { authenticationResult: AuthenticationResult.failed(err) };
    }
  }

  /**
   * Tries to extract authorization header from the state and adds it to the request before
   * it's forwarded to Elasticsearch backend.
   * @param request Request instance.
   * @param state State value previously stored by the provider.
   */
  private async authenticateViaState(
    request: RequestWithLoginAttempt,
    { authorization }: ProviderState
  ) {
    this.debug('Trying to authenticate via state.');

    if (!authorization) {
      this.debug('Access token is not found in state.');
      return AuthenticationResult.notHandled();
    }

    request.headers.authorization = authorization;

    try {
      const user = await this.options.client.callWithRequest(request, 'shield.authenticate');

      this.debug('Request has been authenticated via state.');

      return AuthenticationResult.succeeded(user);
    } catch (err) {
      this.debug(`Failed to authenticate request via state: ${err.message}`);

      // Reset `Authorization` header we've just set. We know for sure that it hasn't been defined before,
      // otherwise it would have been used or completely rejected by the `authenticateViaHeader`.
      // We can't just set `authorization` to `undefined` or `null`, we should remove this property
      // entirely, otherwise `authorization` header without value will cause `callWithRequest` to crash if
      // it's called with this request once again down the line (e.g. in the next authentication provider).
      delete request.headers.authorization;

      return AuthenticationResult.failed(err);
    }
  }

  /**
   * Logs message with `debug` level and saml/security related tags.
   * @param message Message to log.
   */
  private debug(message: string) {
    this.options.log(['debug', 'security', 'basic'], message);
  }
}
