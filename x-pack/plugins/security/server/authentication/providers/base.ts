/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deepFreeze } from '@kbn/std';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type {
  Headers,
  HttpServiceSetup,
  IClusterClient,
  KibanaRequest,
  Logger,
} from 'src/core/server';

import type { AuthenticatedUser } from '../../../common/model';
import type { AuthenticationInfo } from '../../elasticsearch';
import { AuthenticationResult } from '../authentication_result';
import type { DeauthenticationResult } from '../deauthentication_result';
import type { Tokens } from '../tokens';

/**
 * Represents available provider options.
 */
export interface AuthenticationProviderOptions {
  name: string;
  getServerBaseURL: () => string;
  basePath: HttpServiceSetup['basePath'];
  getRequestOriginalURL: (
    request: KibanaRequest,
    additionalQueryStringParameters?: Array<[string, string]>
  ) => string;
  client: IClusterClient;
  logger: Logger;
  tokens: PublicMethodsOf<Tokens>;
  urls: {
    loggedOut: (request: KibanaRequest) => string;
  };
}

/**
 * Represents available provider specific options.
 */
export type AuthenticationProviderSpecificOptions = Record<string, unknown>;

/**
 * Base class that all authentication providers should extend.
 */
export abstract class BaseAuthenticationProvider {
  /**
   * Type of the provider.
   */
  static readonly type: string;

  /**
   * Type of the provider. We use `this.constructor` trick to get access to the static `type` field
   * of the specific `BaseAuthenticationProvider` subclass.
   */
  public readonly type = (this.constructor as any).type as string;

  /**
   * Logger instance bound to a specific provider context.
   */
  protected readonly logger: Logger;

  /**
   * Instantiates AuthenticationProvider.
   * @param options Provider options object.
   */
  constructor(protected readonly options: Readonly<AuthenticationProviderOptions>) {
    this.logger = options.logger;
  }

  /**
   * Performs initial login request and creates user session. Provider isn't required to implement
   * this method if it doesn't support initial login request.
   * @param request Request instance.
   * @param loginAttempt Login attempt associated with the provider.
   * @param [state] Optional state object associated with the provider.
   */
  async login(
    request: KibanaRequest,
    loginAttempt: unknown,
    state?: unknown
  ): Promise<AuthenticationResult> {
    return AuthenticationResult.notHandled();
  }

  /**
   * Performs request authentication based on the session created during login or other information
   * associated with the request (e.g. `Authorization` HTTP header).
   * @param request Request instance.
   * @param [state] Optional state object associated with the provider.
   */
  abstract authenticate(request: KibanaRequest, state?: unknown): Promise<AuthenticationResult>;

  /**
   * Invalidates user session associated with the request.
   * @param request Request instance.
   * @param [state] Optional state object associated with the provider that needs to be invalidated.
   */
  abstract logout(request: KibanaRequest, state?: unknown): Promise<DeauthenticationResult>;

  /**
   * Returns HTTP authentication scheme that provider uses within `Authorization` HTTP header that
   * it attaches to all successfully authenticated requests to Elasticsearch or `null` in case
   * provider doesn't attach any additional `Authorization` HTTP headers.
   */
  abstract getHTTPAuthenticationScheme(): string | null;

  /**
   * Queries Elasticsearch `_authenticate` endpoint to authenticate request and retrieve the user
   * information of authenticated user.
   * @param request Request instance.
   * @param [authHeaders] Optional `Headers` dictionary to send with the request.
   */
  protected async getUser(request: KibanaRequest, authHeaders: Headers = {}) {
    return this.authenticationInfoToAuthenticatedUser(
      // @ts-expect-error Metadata is defined as Record<string, any>
      await this.options.client
        .asScoped({ headers: { ...request.headers, ...authHeaders } })
        .asCurrentUser.security.authenticate()
    );
  }

  /**
   * Converts Elasticsearch Authentication result to a Kibana authenticated user.
   * @param authenticationInfo Result returned from the `_authenticate` operation.
   */
  protected authenticationInfoToAuthenticatedUser(authenticationInfo: AuthenticationInfo) {
    return deepFreeze({
      ...authenticationInfo,
      authentication_provider: { type: this.type, name: this.options.name },
    } as AuthenticatedUser);
  }
}
