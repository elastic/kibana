/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IClusterClient, KibanaRequest, Logger } from '../../../../../src/core/server';
import { SecurityLicense } from '../../common/licensing';
import { HTTPAuthorizationHeader } from './http_authentication';
import { BasicHTTPAuthorizationHeaderCredentials } from './http_authentication';

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

interface GrantAPIKeyParams {
  grant_type: 'password' | 'access_token';
  username?: string;
  password?: string;
  access_token?: string;
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

export interface GrantAPIKeyResult {
  /**
   * Unique id for this API key
   */
  id: string;
  /**
   * Name for this API key
   */
  name: string;
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
   * Determines if API Keys are enabled in Elasticsearch.
   */
  async areAPIKeysEnabled(): Promise<boolean> {
    if (!this.license.isEnabled()) {
      return false;
    }

    const id = `kibana-api-key-service-test`;

    this.logger.debug(
      `Testing if API Keys are enabled by attempting to invalidate a non-existant key: ${id}`
    );

    try {
      await this.clusterClient.callAsInternalUser('shield.invalidateAPIKey', {
        body: {
          id,
        },
      });
      return true;
    } catch (e) {
      if (this.doesErrorIndicateAPIKeysAreDisabled(e)) {
        return false;
      }
      throw e;
    }
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
   * Tries to grant an API key for the current user.
   * @param request Request instance.
   */
  async grantAsInternalUser(request: KibanaRequest) {
    if (!this.license.isEnabled()) {
      return null;
    }

    this.logger.debug('Trying to grant an API key');
    const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(request);
    if (authorizationHeader == null) {
      throw new Error(
        `Unable to grant an API Key, request does not contain an authorization header`
      );
    }
    const params = this.getGrantParams(authorizationHeader);

    // User needs `manage_api_key` or `grant_api_key` privilege to use this API
    let result: GrantAPIKeyResult;
    try {
      result = (await this.clusterClient.callAsInternalUser('shield.grantAPIKey', {
        body: params,
      })) as GrantAPIKeyResult;
      this.logger.debug('API key was granted successfully');
    } catch (e) {
      this.logger.error(`Failed to grant API key: ${e.message}`);
      throw e;
    }

    return result;
  }

  /**
   * Tries to invalidate an API key.
   * @param request Request instance.
   * @param params The params to invalidate an API key.
   */
  async invalidate(request: KibanaRequest, params: InvalidateAPIKeyParams) {
    if (!this.license.isEnabled()) {
      return null;
    }

    this.logger.debug('Trying to invalidate an API key as current user');

    let result: InvalidateAPIKeyResult;
    try {
      // User needs `manage_api_key` privilege to use this API
      result = await this.clusterClient
        .asScoped(request)
        .callAsCurrentUser('shield.invalidateAPIKey', {
          body: {
            id: params.id,
          },
        });
      this.logger.debug('API key was invalidated successfully as current user');
    } catch (e) {
      this.logger.error(`Failed to invalidate API key as current user: ${e.message}`);
      throw e;
    }

    return result;
  }

  /**
   * Tries to invalidate an API key by using the internal user.
   * @param params The params to invalidate an API key.
   */
  async invalidateAsInternalUser(params: InvalidateAPIKeyParams) {
    if (!this.license.isEnabled()) {
      return null;
    }

    this.logger.debug('Trying to invalidate an API key');

    let result: InvalidateAPIKeyResult;
    try {
      // Internal user needs `cluster:admin/xpack/security/api_key/invalidate` privilege to use this API
      result = await this.clusterClient.callAsInternalUser('shield.invalidateAPIKey', {
        body: {
          id: params.id,
        },
      });
      this.logger.debug('API key was invalidated successfully');
    } catch (e) {
      this.logger.error(`Failed to invalidate API key: ${e.message}`);
      throw e;
    }

    return result;
  }

  private doesErrorIndicateAPIKeysAreDisabled(e: Record<string, any>) {
    const disabledFeature = e.body?.error?.['disabled.feature'];
    return disabledFeature === 'api_keys';
  }

  private getGrantParams(authorizationHeader: HTTPAuthorizationHeader): GrantAPIKeyParams {
    if (authorizationHeader.scheme.toLowerCase() === 'bearer') {
      return {
        grant_type: 'access_token',
        access_token: authorizationHeader.credentials,
      };
    }

    if (authorizationHeader.scheme.toLowerCase() === 'basic') {
      const basicCredentials = BasicHTTPAuthorizationHeaderCredentials.parseFromCredentials(
        authorizationHeader.credentials
      );
      return {
        grant_type: 'password',
        username: basicCredentials.username,
        password: basicCredentials.password,
      };
    }

    throw new Error(`Unsupported scheme "${authorizationHeader.scheme}" for granting API Key`);
  }
}
