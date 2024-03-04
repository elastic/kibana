/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

import type { AuthenticationProviderOptions } from './base';
import { BaseAuthenticationProvider } from './base';
import { ROUTE_TAG_ACCEPT_JWT } from '../../routes/tags';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';
import { HTTPAuthorizationHeader } from '../http_authentication';

/**
 * A type-string of the Elasticsearch JWT realm.
 */
const JWT_REALM_TYPE = 'jwt';

interface HTTPAuthenticationProviderOptions {
  supportedSchemes: Set<string>;
  jwt?: {
    // When set, only routes marked with `ROUTE_TAG_ACCEPT_JWT` tag will accept JWT as a means of authentication.
    taggedRoutesOnly: boolean;
  };
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

  /**
   * Options relevant to the JWT authentication.
   */
  private readonly jwt: HTTPAuthenticationProviderOptions['jwt'];

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
    this.jwt = httpOptions.jwt;
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

      // If Kibana is configured to restrict JWT authentication only to selected routes, ensure that the route is marked
      // with the `ROUTE_TAG_ACCEPT_JWT` tag to bypass that restriction.
      if (
        user.authentication_realm.type === JWT_REALM_TYPE &&
        this.jwt?.taggedRoutesOnly &&
        !request.route.options.tags.includes(ROUTE_TAG_ACCEPT_JWT)
      ) {
        // Log a portion of the JWT signature to make debugging easier.
        const jwtExcerpt = authorizationHeader.credentials.slice(-10);
        this.logger.error(
          `Attempted to authenticate with JWT credentials (…${jwtExcerpt}) against ${request.url.pathname}${request.url.search}, but it's not allowed. ` +
            `Ensure that the route is defined with the "${ROUTE_TAG_ACCEPT_JWT}" tag.`
        );
        return AuthenticationResult.notHandled();
      }

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
