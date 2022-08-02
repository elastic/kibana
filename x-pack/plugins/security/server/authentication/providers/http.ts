/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';
import { HTTPAuthorizationHeader } from '../http_authentication';
import type { AuthenticationProviderOptions } from './base';
import { BaseAuthenticationProvider } from './base';

interface HTTPAuthenticationProviderOptions {
  supportedSchemes: Set<string>;
}

/**
 * Provider that supports request authentication via forwarding `Authorization` HTTP header to Elasticsearch.
 */
export class HTTPAuthenticationProvider extends BaseAuthenticationProvider {
  /**
   * Type of the provider.
   */
  static readonly type = 'http';

  /**
   * Set of the schemes (`Basic`, `Bearer` etc.) that provider expects to see within `Authorization`
   * HTTP header while authenticating request.
   */
  private readonly supportedSchemes: Set<string>;

  constructor(
    protected readonly options: Readonly<AuthenticationProviderOptions>,
    httpOptions: Readonly<HTTPAuthenticationProviderOptions>
  ) {
    super(options);

    if ((httpOptions?.supportedSchemes?.size ?? 0) === 0) {
      throw new Error('Supported schemes should be specified');
    }
    this.supportedSchemes = new Set(
      [...httpOptions.supportedSchemes].map((scheme) => scheme.toLowerCase())
    );
  }

  /**
   * NOT SUPPORTED.
   */
  public async login() {
    this.logger.debug('Login is not supported.');
    return AuthenticationResult.notHandled();
  }

  /**
   * Performs request authentication using provided `Authorization` HTTP headers.
   * @param request Request instance.
   */
  public async authenticate(request: KibanaRequest) {
    this.logger.debug(
      `Trying to authenticate user request to ${request.url.pathname}${request.url.search}.`
    );

    const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(request);
    if (authorizationHeader == null) {
      this.logger.debug('Authorization header is not presented.');
      return AuthenticationResult.notHandled();
    }

    if (!this.supportedSchemes.has(authorizationHeader.scheme.toLowerCase())) {
      this.logger.debug(`Unsupported authentication scheme: ${authorizationHeader.scheme}`);
      return AuthenticationResult.notHandled();
    }

    try {
      const user = await this.getUser(request);
      this.logger.debug(
        `Request to ${request.url.pathname}${request.url.search} has been authenticated via authorization header with "${authorizationHeader.scheme}" scheme.`
      );
      return AuthenticationResult.succeeded(user);
    } catch (err) {
      this.logger.debug(
        `Failed to authenticate request to ${request.url.pathname}${request.url.search} via authorization header with "${authorizationHeader.scheme}" scheme: ${err.message}`
      );
      return AuthenticationResult.failed(err);
    }
  }

  /**
   * NOT SUPPORTED.
   */
  public async logout() {
    this.logger.debug('Logout is not supported.');
    return DeauthenticationResult.notHandled();
  }

  /**
   * Returns `null` since provider doesn't attach any additional `Authorization` HTTP headers to
   * successfully authenticated requests to Elasticsearch.
   */
  public getHTTPAuthenticationScheme() {
    return null;
  }
}
