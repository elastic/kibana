/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IClusterClient, KibanaRequest, Logger } from '../../../../../src/core/server';
import { SecurityLicense } from '../licensing';

/**
 * Represents the options to create an APIKey class instance that will be
 * shared between functions (create, invalidate, etc).
 */
export interface ConstructorOptions {
  logger: Logger;
  clusterClient: IClusterClient;
  license: SecurityLicense;
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
  private readonly clusterClient: IClusterClient;
  private readonly license: SecurityLicense;

  constructor({ logger, clusterClient, license }: ConstructorOptions) {
    this.logger = logger;
    this.clusterClient = clusterClient;
    this.license = license;
  }

  /**
   * Tries to create an API key for the current user.
   * @param request Request instance.
   * @param params The params to create an API key
   */
  async create(
    request: KibanaRequest,
    params: CreateAPIKeyParams
  ): Promise<CreateAPIKeyResult | null> {
    if (!this.license.isEnabled()) {
      return null;
    }

    this.logger.debug('Trying to create an API key');

    // User needs `manage_api_key` privilege to use this API
    let result: CreateAPIKeyResult;
    try {
      result = (await this.clusterClient
        .asScoped(request)
        .callAsCurrentUser('shield.createAPIKey', { body: params })) as CreateAPIKeyResult;
      this.logger.debug('API key was created successfully');
    } catch (e) {
      this.logger.error(`Failed to create API key: ${e.message}`);
      throw e;
    }

    return result;
  }

  /**
   * Tries to invalidate an API key.
   * @param request Request instance.
   * @param params The params to invalidate an API key.
   */
  async invalidate(
    request: KibanaRequest,
    params: InvalidateAPIKeyParams
  ): Promise<InvalidateAPIKeyResult | null> {
    if (!this.license.isEnabled()) {
      return null;
    }

    this.logger.debug('Trying to invalidate an API key');

    // User needs `manage_api_key` privilege to use this API
    let result: InvalidateAPIKeyResult;
    try {
      result = (await this.clusterClient
        .asScoped(request)
        .callAsCurrentUser('shield.invalidateAPIKey', {
          body: {
            id: params.id,
          },
        })) as InvalidateAPIKeyResult;
      this.logger.debug('API key was invalidated successfully');
    } catch (e) {
      this.logger.error(`Failed to invalidate API key: ${e.message}`);
      throw e;
    }

    return result;
  }
}
