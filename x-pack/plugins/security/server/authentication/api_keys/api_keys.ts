/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import type { IClusterClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { KibanaFeature } from '@kbn/features-plugin/server';
import type {
  APIKeys as APIKeysType,
  CreateAPIKeyParams,
  CreateAPIKeyResult,
  CreateCrossClusterAPIKeyParams,
  CreateRestAPIKeyParams,
  CreateRestAPIKeyWithKibanaPrivilegesParams,
  GrantAPIKeyResult,
  InvalidateAPIKeyResult,
  InvalidateAPIKeysParams,
  ValidateAPIKeyParams,
} from '@kbn/security-plugin-types-server';

import { getFakeKibanaRequest } from './fake_kibana_request';
import type { SecurityLicense } from '../../../common';
import { transformPrivilegesToElasticsearchPrivileges, validateKibanaPrivileges } from '../../lib';
import type { UpdateAPIKeyParams, UpdateAPIKeyResult } from '../../routes/api_keys';
import {
  BasicHTTPAuthorizationHeaderCredentials,
  HTTPAuthorizationHeader,
} from '../http_authentication';

export type { UpdateAPIKeyParams, UpdateAPIKeyResult };

const ELASTICSEARCH_CLIENT_AUTHENTICATION_HEADER = 'es-client-authentication';

/**
 * Represents the options to create an APIKey class instance that will be
 * shared between functions (create, invalidate, etc).
 */
export interface ConstructorOptions {
  logger: Logger;
  getClusterClient: () => Promise<IClusterClient>;
  license: SecurityLicense;
  applicationName: string;
  getKibanaFeatures: () => Promise<KibanaFeature[]>;
}

type GrantAPIKeyParams =
  | {
      api_key: CreateRestAPIKeyParams | CreateRestAPIKeyWithKibanaPrivilegesParams;
      grant_type: 'password';
      username: string;
      password: string;
    }
  | {
      api_key: CreateRestAPIKeyParams | CreateRestAPIKeyWithKibanaPrivilegesParams;
      grant_type: 'access_token';
      access_token: string;
    };

function isCreateRestAPIKeyParams(params: any): params is CreateRestAPIKeyParams {
  return params && typeof params.name === 'string' && typeof params.role_descriptors === 'object';
}

function isCreateRestAPIKeyWithKibanaPrivilegesParams(
  params: any
): params is CreateRestAPIKeyWithKibanaPrivilegesParams {
  return (
    params &&
    typeof params.name === 'string' &&
    params.role_descriptors === null &&
    typeof params.kibana_role_descriptors === 'object'
  );
}

function isCreateCrossClusterAPIKeyParams(params: any): params is CreateCrossClusterAPIKeyParams {
  return (
    params &&
    typeof params.name === 'string' &&
    params.role_descriptors === null &&
    typeof params.access === 'object'
  );
}

/**
 * Class responsible for managing Elasticsearch API keys.
 */
export class APIKeys implements APIKeysType {
  private readonly logger: Logger;
  private readonly getClusterClient: () => Promise<IClusterClient>;
  private readonly license: SecurityLicense;
  private readonly applicationName: string;
  private readonly getKibanaFeatures: () => Promise<KibanaFeature[]>;

  constructor({
    logger,
    getClusterClient,
    license,
    applicationName,
    getKibanaFeatures,
  }: ConstructorOptions) {
    this.logger = logger;
    this.getClusterClient = getClusterClient;
    this.license = license;
    this.applicationName = applicationName;
    this.getKibanaFeatures = getKibanaFeatures;
  }

  /**
   * Determines if API Keys are enabled in Elasticsearch.
   */
  async areAPIKeysEnabled(): Promise<boolean> {
    if (!this.license.isEnabled()) {
      return false;
    }

    const id = 'kibana-api-key-service-test';

    this.logger.debug(
      `Testing if API Keys are enabled by attempting to invalidate a non-existant key: ${id}`
    );
    const clusterClient = await this.getClusterClient();
    try {
      await clusterClient.asInternalUser.security.invalidateApiKey({
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
   * Determines if cross-cluster API Keys are enabled in Elasticsearch.
   */
  async areCrossClusterAPIKeysEnabled(): Promise<boolean> {
    if (!this.license.isEnabled()) {
      return false;
    }

    const id = 'kibana-api-key-service-test';

    this.logger.debug(
      `Testing if cross-cluster API Keys are enabled by attempting to update a non-existant key: ${id}`
    );
    const clusterClient = await this.getClusterClient();
    try {
      await clusterClient.asInternalUser.transport.request({
        method: 'PUT',
        path: `/_security/cross_cluster/api_key/${id}`,
        body: {}, // We are sending an empty request body and expect a validation error if Update cross-cluster API key endpoint is available.
      });
      return false;
    } catch (error) {
      return !this.doesErrorIndicateCrossClusterAPIKeysAreDisabled(error);
    }
  }

  /**
   * Tries to create an API key for the current user.
   *
   * Returns newly created API key or `null` if API keys are disabled.
   *
   * User needs `manage_api_key` privilege to create REST API keys and `manage_security` for cross-cluster API keys.
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
    const clusterClient = await this.getClusterClient();
    const { type, expiration, name, metadata } = createParams;
    const scopedClusterClient = clusterClient.asScoped(request);

    this.logger.debug('Trying to create an API key');

    let result: CreateAPIKeyResult;

    try {
      if (type === 'cross_cluster') {
        result = await scopedClusterClient.asCurrentUser.transport.request<CreateAPIKeyResult>({
          method: 'POST',
          path: '/_security/cross_cluster/api_key',
          body: { name, expiration, metadata, access: createParams.access },
        });
      } else {
        const features = await this.getKibanaFeatures();
        result = await scopedClusterClient.asCurrentUser.security.createApiKey({
          body: {
            name,
            expiration,
            metadata,
            role_descriptors:
              'role_descriptors' in createParams
                ? createParams.role_descriptors
                : this.parseRoleDescriptorsWithKibanaPrivileges(
                    createParams.kibana_role_descriptors,
                    features,
                    false
                  ),
          },
        });
      }

      this.logger.debug('API key was created successfully');
    } catch (error) {
      this.logger.error(`Failed to create API key: ${error.message}`);
      throw error;
    }
    return result;
  }

  /**
   * Attempts update an API key with the provided 'role_descriptors' and 'metadata'
   *
   * Returns `updated`, `true` if the update was successful, `false` if there was nothing to update
   *
   * User needs `manage_api_key` privilege to update REST API keys and `manage_security` for cross-cluster API keys.
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
    const clusterClient = await this.getClusterClient();
    const { type, id, metadata } = updateParams;
    const scopedClusterClient = clusterClient.asScoped(request);

    this.logger.debug('Trying to edit an API key');

    let result: UpdateAPIKeyResult;
    try {
      if (type === 'cross_cluster') {
        result = await scopedClusterClient.asCurrentUser.transport.request<UpdateAPIKeyResult>({
          method: 'PUT',
          path: `/_security/cross_cluster/api_key/${id}`,
          body: { metadata, access: updateParams.access },
        });
      } else {
        const features = await this.getKibanaFeatures();
        result = await scopedClusterClient.asCurrentUser.security.updateApiKey({
          id,
          metadata,
          role_descriptors:
            'role_descriptors' in updateParams
              ? updateParams.role_descriptors
              : this.parseRoleDescriptorsWithKibanaPrivileges(
                  updateParams.kibana_role_descriptors,
                  features,
                  true
                ),
        });
      }

      if (result.updated) {
        this.logger.debug('API key was updated successfully');
      } else {
        this.logger.debug('There were no updates to make for API key');
      }
    } catch (error) {
      this.logger.error(`Failed to update API key: ${error.message}`);
      throw error;
    }
    return result;
  }

  /**
   * Tries to grant an API key for the current user.
   * @param request Request instance.
   * @param createParams Create operation parameters.
   */
  async grantAsInternalUser(
    request: KibanaRequest,
    createParams: CreateRestAPIKeyParams | CreateRestAPIKeyWithKibanaPrivilegesParams
  ) {
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

    // Try to extract optional Elasticsearch client credentials (currently only used by JWT).
    const clientAuthorizationHeader = HTTPAuthorizationHeader.parseFromRequest(
      request,
      ELASTICSEARCH_CLIENT_AUTHENTICATION_HEADER
    );

    const { expiration, metadata, name } = createParams;
    const features = await this.getKibanaFeatures();
    const roleDescriptors =
      'role_descriptors' in createParams
        ? createParams.role_descriptors
        : this.parseRoleDescriptorsWithKibanaPrivileges(
            createParams.kibana_role_descriptors,
            features,
            false
          );

    const params = this.getGrantParams(
      { expiration, metadata, name, role_descriptors: roleDescriptors },
      authorizationHeader,
      clientAuthorizationHeader
    );
    const clusterClient = await this.getClusterClient();
    // User needs `manage_api_key` or `grant_api_key` privilege to use this API
    let result: GrantAPIKeyResult;
    try {
      result = await clusterClient.asInternalUser.security.grantApiKey({ body: params });
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
    const clusterClient = await this.getClusterClient();
    let result: InvalidateAPIKeyResult;
    try {
      // User needs `manage_api_key` privilege to use this API
      result = await clusterClient.asScoped(request).asCurrentUser.security.invalidateApiKey({
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
    const clusterClient = await this.getClusterClient();
    try {
      // Internal user needs `cluster:admin/xpack/security/api_key/invalidate` privilege to use this API
      result = await clusterClient.asInternalUser.security.invalidateApiKey({
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
    const clusterClient = await this.getClusterClient();
    try {
      await clusterClient.asScoped(fakeRequest).asCurrentUser.security.authenticate();
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

  private doesErrorIndicateCrossClusterAPIKeysAreDisabled(error: Record<string, any>) {
    return (
      error.statusCode !== 400 || error.body?.error?.type !== 'action_request_validation_exception'
    );
  }

  private getGrantParams(
    createParams: CreateRestAPIKeyParams | CreateRestAPIKeyWithKibanaPrivilegesParams,
    authorizationHeader: HTTPAuthorizationHeader,
    clientAuthorizationHeader: HTTPAuthorizationHeader | null
  ): GrantAPIKeyParams {
    if (authorizationHeader.scheme.toLowerCase() === 'bearer') {
      return {
        api_key: createParams,
        grant_type: 'access_token',
        access_token: authorizationHeader.credentials,
        ...(clientAuthorizationHeader
          ? {
              client_authentication: {
                scheme: clientAuthorizationHeader.scheme,
                value: clientAuthorizationHeader.credentials,
              },
            }
          : {}),
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
    kibanaRoleDescriptors: CreateRestAPIKeyWithKibanaPrivilegesParams['kibana_role_descriptors'],
    features: KibanaFeature[],
    isEdit: boolean
  ) {
    const roleDescriptors = Object.create(null);

    const allValidationErrors: string[] = [];
    if (kibanaRoleDescriptors) {
      Object.entries(kibanaRoleDescriptors).forEach(([roleKey, roleDescriptor]) => {
        const { validationErrors } = validateKibanaPrivileges(features, roleDescriptor.kibana);
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
