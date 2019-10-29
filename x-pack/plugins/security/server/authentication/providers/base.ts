/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  KibanaRequest,
  Logger,
  HttpServiceSetup,
  IClusterClient,
  Headers,
} from '../../../../../../src/core/server';
import { AuthenticatedUser } from '../../../common/model';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';
import { Tokens } from '../tokens';

/**
 * Represents available provider options.
 */
export interface AuthenticationProviderOptions {
  getServerBaseURL: () => string;
  basePath: HttpServiceSetup['basePath'];
  client: IClusterClient;
  logger: Logger;
  tokens: PublicMethodsOf<Tokens>;
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
   * Queries Elasticsearch `_authenticate` endpoint to authenticate request and retrieve the user
   * information of authenticated user.
   * @param request Request instance.
   * @param [authHeaders] Optional `Headers` dictionary to send with the request.
   */
  protected async getUser(request: KibanaRequest, authHeaders: Headers = {}) {
    return (await this.options.client
      .asScoped({ headers: { ...request.headers, ...authHeaders } })
      .callAsCurrentUser('shield.authenticate')) as AuthenticatedUser;
  }
}
