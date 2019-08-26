/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ClusterClient, KibanaRequest, Logger } from '../../../../../src/core/server';

/**
 * Represents the options to create an APIKey class instance that will be
 * shared between functions (create, invalidate, etc).
 */
export interface ConstructorOptions {
  logger: Logger;
  clusterClient: PublicMethodsOf<ClusterClient>;
  isSecurityFeatureDisabled: () => boolean;
}

/**
 * Represents the params for creating an API key
 */
export interface CreateAPIKeyParams {
  name: string;
  role_descriptors: Record<string, any>;
  expiration?: string;
}

/**
 * Represents the params for invalidating an API key
 */
export interface InvalidateAPIKeyParams {
  id: string;
}

/**
 * The return value when creating an API key in Elasticsearch. The API key returned by this API
 * can then be used by sending a request with a Authorization header with a value having the
 * prefix ApiKey `{token}` where token is id and api_key joined by a colon `{id}:{api_key}` and
 * then encoded to base64.
 */
export interface CreateAPIKeyResult {
  /**
   * Unique id for this API key
   */
  id: string;
  /**
   * Name for this API key
   */
  name: string;
  /**
   * Optional expiration in milliseconds for this API key
   */
  expiration?: number;
  /**
   * Generated API key
   */
  api_key: string;
}

/**
 * The return value when invalidating an API key in Elasticsearch.
 */
export interface InvalidateAPIKeyResult {
  /**
   * The IDs of the API keys that were invalidated as part of the request.
   */
  invalidated_api_keys: string[];
  /**
   * The IDs of the API keys that were already invalidated.
   */
  previously_invalidated_api_keys: string[];
  /**
   * The number of errors that were encountered when invalidating the API keys.
   */
  error_count: number;
  /**
   * Details about these errors. This field is not present in the response when error_count is 0.
   */
  error_details?: Array<{
    type: string;
    reason: string;
    caused_by: {
      type: string;
      reason: string;
    };
  }>;
}

/**
 * Class responsible for managing Elasticsearch API keys.
 */
export class APIKeys {
  private readonly logger: Logger;
  private readonly clusterClient: PublicMethodsOf<ClusterClient>;
  private readonly isSecurityFeatureDisabled: () => boolean;

  constructor({ logger, clusterClient, isSecurityFeatureDisabled }: ConstructorOptions) {
    this.logger = logger;
    this.clusterClient = clusterClient;
    this.isSecurityFeatureDisabled = isSecurityFeatureDisabled;
  }

  /**
   * Tries to create an API key for the current user.
   * @param param0 The options to create an API key
   */
  async create(
    request: KibanaRequest,
    body: CreateAPIKeyParams
  ): Promise<CreateAPIKeyResult | null> {
    if (this.isSecurityFeatureDisabled()) {
      return null;
    }

    this.logger.debug('Trying to create an API key');

    // User needs `manage_api_key` privilege to use this API
    const key = (await this.clusterClient
      .asScoped(request)
      .callAsCurrentUser('shield.createAPIKey', { body })) as CreateAPIKeyResult;

    this.logger.debug('API key was created successfully');

    return key;
  }

  /**
   * Tries to invalidate an API key.
   * @param param0 The options to invalidate an API key.
   */
  async invalidate(
    request: KibanaRequest,
    body: InvalidateAPIKeyParams
  ): Promise<InvalidateAPIKeyResult | null> {
    if (this.isSecurityFeatureDisabled()) {
      return null;
    }

    this.logger.debug('Trying to invalidate an API key');

    // User needs `manage_api_key` privilege to use this API
    const result = (await this.clusterClient
      .asScoped(request)
      .callAsCurrentUser('shield.invalidateAPIKey', { body })) as InvalidateAPIKeyResult;

    this.logger.debug('API key was invalidated successfully');

    return result;
  }
}
