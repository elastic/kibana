/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';

/**
 * Represents available provider options.
 */
export interface AuthenticationProviderOptions {
  protocol: string;
  hostname: string;
  port: number;
  basePath: string;
  client: Legacy.Plugins.elasticsearch.Cluster;
  log: (tags: string[], message: string) => void;
}

/**
 * Base class that all authentication providers should extend.
 */
export abstract class BaseAuthenticationProvider {
  /**
   * Instantiates AuthenticationProvider.
   * @param options Provider options object.
   */
  constructor(protected readonly options: Readonly<AuthenticationProviderOptions>) {}

  /**
   * Performs request authentication.
   * @param request Request instance.
   * @param [state] Optional state object associated with the provider.
   */
  abstract authenticate(request: Legacy.Request, state?: unknown): Promise<AuthenticationResult>;

  /**
   * Invalidates user session associated with the request.
   * @param request Request instance.
   * @param [state] Optional state object associated with the provider that needs to be invalidated.
   */
  abstract deauthenticate(
    request: Legacy.Request,
    state?: unknown
  ): Promise<DeauthenticationResult>;
}
