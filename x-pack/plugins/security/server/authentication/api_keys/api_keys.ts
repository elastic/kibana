/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import type { IClusterClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { KibanaFeature } from '@kbn/features-plugin/server';
import type { OneOf } from '@kbn/utility-types';

import type { SecurityLicense } from '../../../common/licensing';
import type { ElasticsearchPrivilegesType, KibanaPrivilegesType } from '../../lib';
import { transformPrivilegesToElasticsearchPrivileges, validateKibanaPrivileges } from '../../lib';
import {
  BasicHTTPAuthorizationHeaderCredentials,
  HTTPAuthorizationHeader,
} from '../http_authentication';
import { getFakeKibanaRequest } from './fake_kibana_request';

/**
 * Represents the options to create an APIKey class instance that will be
 * shared between functions (create, invalidate, etc).
 */
export interface ConstructorOptions {
  logger: Logger;
  clusterClient: IClusterClient;
  license: SecurityLicense;
  applicationName: string;
  kibanaFeatures: KibanaFeature[];
}

interface BaseCreateAPIKeyParams {
  name: string;
  expiration?: string;
  metadata?: Record<string, any>;
  role_descriptors: Record<string, any>;
  kibana_role_descriptors: Record<
    string,
    { elasticsearch: ElasticsearchPrivilegesType; kibana: KibanaPrivilegesType }
  >;
}

interface BaseUpdateAPIKeyParams {
  id: string;
  metadata?: Record<string, any>;
  role_descriptors: Record<string, any>;
  kibana_role_descriptors: Record<
    string,
    { elasticsearch: ElasticsearchPrivilegesType; kibana: KibanaPrivilegesType }
  >;
}

/**
 * Represents the params for creating an API key
 */
export type CreateAPIKeyParams = OneOf<
  BaseCreateAPIKeyParams,
  'role_descriptors' | 'kibana_role_descriptors'
>;

/**
 * Represents the params for updating an API key
 */
export type UpdateAPIKeyParams = OneOf<
  BaseUpdateAPIKeyParams,
  'role_descriptors' | 'kibana_role_descriptors'
>;

type GrantAPIKeyParams =
  | {
      api_key: CreateAPIKeyParams;
      grant_type: 'password';
      username: string;
      password: string;
    }
  | {
      api_key: CreateAPIKeyParams;
      grant_type: 'access_token';
      access_token: string;
    };

/**
 * Represents the params for invalidating multiple API keys
 */
export interface InvalidateAPIKeysParams {
  ids: string[];
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
 * The return value when update an API key in Elasticsearch. The value returned by this API
 * can is contains a `updated` boolean that corresponds to whether or not the API key was updated
 */
export interface UpdateAPIKeyResult {
  /**
   * Boolean represented if the API key was updated in ES
   */
  updated: boolean;
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
    type?: string;
    reason?: string;
    caused_by?: {
      type?: string;
      reason?: string;
    };
  }>;
}

/**
 * Represents the parameters for validating API Key credentials.
 */
export interface ValidateAPIKeyParams {
  /**
   * Unique id for this API key
   */
  id: string;

  /**
   * Generated API Key (secret)
   */
  api_key: string;
}

/**
 * Class responsible for managing Elasticsearch API keys.
 */
export class APIKeys {
  private readonly logger: Logger;
  private readonly clusterClient: IClusterClient;
  private readonly license: SecurityLicense;
  private readonly applicationName: string;
  private readonly kibanaFeatures: KibanaFeature[];

  constructor({
    logger,
    clusterClient,
    license,
    applicationName,
    kibanaFeatures,
  }: ConstructorOptions) {
    this.logger = logger;
    this.clusterClient = clusterClient;
    this.license = license;
    this.applicationName = applicationName;
    this.kibanaFeatures = kibanaFeatures;
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
      await this.clusterClient.asInternalUser.security.invalidateApiKey({
        body: {
          ids: [id],
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
   *
   * Returns newly created API key or `null` if API keys are disabled.
   *
   * @param request Request instance.
   * @param createParams The params to create an API key
   */
  async create(
    request: KibanaRequest,
    createParams: CreateAPIKeyParams
  ): Promise<CreateAPIKeyResult | null> {
    if (!this.license.isEnabled()) {
      return null;
    }

    const { expiration, metadata, name } = createParams;

    const roleDescriptors = this.parseRoleDescriptorsWithKibanaPrivileges(createParams, false);

    this.logger.debug('Trying to create an API key');

    // User needs `manage_api_key` privilege to use this API
    let result: CreateAPIKeyResult;
    try {
      result = await this.clusterClient.asScoped(request).asCurrentUser.security.createApiKey({
        body: { role_descriptors: roleDescriptors, name, metadata, expiration },
      });
      this.logger.debug('API key was created successfully');
    } catch (e) {
      this.logger.error(`Failed to create API key: ${e.message}`);
      throw e;
    }
    return result;
  }

  /**
   * Attempts update an API key with the provided 'role_descriptors' and 'metadata'
   *
   * Returns `updated`, `true` if the update was successful, `false` if there was nothing to update
   *
   * @param request Request instance.
   * @param updateParams The params to edit an API key
   */
  async update(
    request: KibanaRequest,
    updateParams: UpdateAPIKeyParams
  ): Promise<UpdateAPIKeyResult | null> {
    if (!this.license.isEnabled()) {
      return null;
    }

    const { id, metadata } = updateParams;

    const roleDescriptors = this.parseRoleDescriptorsWithKibanaPrivileges(updateParams, true);

    this.logger.debug('Trying to edit an API key');

    // User needs `manage_api_key` privilege to use this API
    let result: UpdateAPIKeyResult;

    try {
      result = await this.clusterClient.asScoped(request).asCurrentUser.security.updateApiKey({
        id,
        role_descriptors: roleDescriptors,
        metadata,
      });

      if (result.updated) {
        this.logger.debug('API key was updated successfully');
      } else {
        this.logger.debug('There were no updates to make for API key');
      }
    } catch (e) {
      this.logger.error(`Failed to update API key: ${e.message}`);
      throw e;
    }

    return result;
  }

  /**
   * Tries to grant an API key for the current user.
   * @param request Request instance.
   * @param createParams Create operation parameters.
   */
  async grantAsInternalUser(request: KibanaRequest, createParams: CreateAPIKeyParams) {
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
    const { expiration, metadata, name } = createParams;

    const roleDescriptors = this.parseRoleDescriptorsWithKibanaPrivileges(createParams, false);

    const params = this.getGrantParams(
      { expiration, metadata, name, role_descriptors: roleDescriptors },
      authorizationHeader
    );

    // User needs `manage_api_key` or `grant_api_key` privilege to use this API
    let result: GrantAPIKeyResult;
    try {
      result = await this.clusterClient.asInternalUser.security.grantApiKey({ body: params });
      this.logger.debug('API key was granted successfully');
    } catch (e) {
      this.logger.error(`Failed to grant API key: ${e.message}`);
      throw e;
    }

    return result;
  }

  /**
   * Tries to invalidate an API keys.
   * @param request Request instance.
   * @param params The params to invalidate an API keys.
   */
  async invalidate(request: KibanaRequest, params: InvalidateAPIKeysParams) {
    if (!this.license.isEnabled()) {
      return null;
    }

    this.logger.debug(`Trying to invalidate ${params.ids.length} an API key as current user`);

    let result: InvalidateAPIKeyResult;
    try {
      // User needs `manage_api_key` privilege to use this API
      result = await this.clusterClient.asScoped(request).asCurrentUser.security.invalidateApiKey({
        body: {
          ids: params.ids,
        },
      });
      this.logger.debug(
        `API keys by ids=[${params.ids.join(', ')}] was invalidated successfully as current user`
      );
    } catch (e) {
      this.logger.error(
        `Failed to invalidate API keys by ids=[${params.ids.join(', ')}] as current user: ${
          e.message
        }`
      );
      throw e;
    }

    return result;
  }

  /**
   * Tries to invalidate the API keys by using the internal user.
   * @param params The params to invalidate the API keys.
   */
  async invalidateAsInternalUser(params: InvalidateAPIKeysParams) {
    if (!this.license.isEnabled()) {
      return null;
    }

    this.logger.debug(`Trying to invalidate ${params.ids.length} API keys`);

    let result: InvalidateAPIKeyResult;
    try {
      // Internal user needs `cluster:admin/xpack/security/api_key/invalidate` privilege to use this API
      result = await this.clusterClient.asInternalUser.security.invalidateApiKey({
        body: {
          ids: params.ids,
        },
      });
      this.logger.debug(`API keys by ids=[${params.ids.join(', ')}] was invalidated successfully`);
    } catch (e) {
      this.logger.error(
        `Failed to invalidate API keys by ids=[${params.ids.join(', ')}]: ${e.message}`
      );
      throw e;
    }

    return result;
  }

  /**
   * Tries to validate an API key.
   * @param apiKeyPrams ValidateAPIKeyParams.
   */
  async validate(apiKeyPrams: ValidateAPIKeyParams): Promise<boolean> {
    if (!this.license.isEnabled()) {
      return false;
    }

    const fakeRequest = getFakeKibanaRequest(apiKeyPrams);

    this.logger.debug(`Trying to validate an API key`);

    try {
      await this.clusterClient.asScoped(fakeRequest).asCurrentUser.security.authenticate();
      this.logger.debug(`API key was validated successfully`);
      return true;
    } catch (e) {
      this.logger.info(`Failed to validate API key: ${e.message}`);
    }

    return false;
  }

  private doesErrorIndicateAPIKeysAreDisabled(e: Record<string, any>) {
    const disabledFeature = e.body?.error?.['disabled.feature'];
    return disabledFeature === 'api_keys';
  }

  private getGrantParams(
    createParams: CreateAPIKeyParams,
    authorizationHeader: HTTPAuthorizationHeader
  ): GrantAPIKeyParams {
    if (authorizationHeader.scheme.toLowerCase() === 'bearer') {
      return {
        api_key: createParams,
        grant_type: 'access_token',
        access_token: authorizationHeader.credentials,
      };
    }

    if (authorizationHeader.scheme.toLowerCase() === 'basic') {
      const basicCredentials = BasicHTTPAuthorizationHeaderCredentials.parseFromCredentials(
        authorizationHeader.credentials
      );
      return {
        api_key: createParams,
        grant_type: 'password',
        username: basicCredentials.username,
        password: basicCredentials.password,
      };
    }

    throw new Error(`Unsupported scheme "${authorizationHeader.scheme}" for granting API Key`);
  }

  private parseRoleDescriptorsWithKibanaPrivileges(
    params: Partial<{
      kibana_role_descriptors: Record<
        string,
        { elasticsearch: ElasticsearchPrivilegesType; kibana: KibanaPrivilegesType }
      >;
      role_descriptors: Record<string, any>;
    }>,
    isEdit: boolean
  ) {
    if (params.role_descriptors) {
      return params.role_descriptors;
    }

    const roleDescriptors = Object.create(null);

    const { kibana_role_descriptors: kibanaRoleDescriptors } = params;

    const allValidationErrors: string[] = [];
    if (kibanaRoleDescriptors) {
      Object.entries(kibanaRoleDescriptors).forEach(([roleKey, roleDescriptor]) => {
        const { validationErrors } = validateKibanaPrivileges(
          this.kibanaFeatures,
          roleDescriptor.kibana
        );
        allValidationErrors.push(...validationErrors);

        const applications = transformPrivilegesToElasticsearchPrivileges(
          this.applicationName,
          roleDescriptor.kibana
        );
        if (applications.length > 0 && roleDescriptors) {
          roleDescriptors[roleKey] = {
            ...roleDescriptor.elasticsearch,
            applications,
          };
        }
      });
    }
    if (allValidationErrors.length) {
      if (isEdit) {
        throw new UpdateApiKeyValidationError(
          `API key cannot be updated due to validation errors: ${JSON.stringify(
            allValidationErrors
          )}`
        );
      } else {
        throw new CreateApiKeyValidationError(
          `API key cannot be created due to validation errors: ${JSON.stringify(
            allValidationErrors
          )}`
        );
      }
    }

    return roleDescriptors;
  }
}

export class CreateApiKeyValidationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class UpdateApiKeyValidationError extends Error {
  constructor(message: string) {
    super(message);
  }
}
