/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import Boom from '@hapi/boom';

import type { SavedObject } from '@kbn/core/server';
import { SavedObjectsUtils } from '@kbn/core/server';
import type { FindActionResult } from '@kbn/actions-plugin/server/types';
import type { ActionType } from '@kbn/actions-plugin/common';
import { CasesConnectorFeatureId } from '@kbn/actions-plugin/common';
import type {
  Configuration,
  ConfigurationAttributes,
  Configurations,
  ConnectorMappings,
} from '../../../common/types/domain';
import type {
  ConfigurationPatchRequest,
  ConfigurationRequest,
  ConnectorMappingResponse,
  GetConfigurationFindRequest,
} from '../../../common/types/api';
import {
  ConfigurationPatchRequestRt,
  ConfigurationRequestRt,
  GetConfigurationFindRequestRt,
  FindActionConnectorResponseRt,
} from '../../../common/types/api';
import { decodeWithExcessOrThrow, decodeOrThrow } from '../../common/runtime_types';
import {
  MAX_CONCURRENT_SEARCHES,
  MAX_SUPPORTED_CONNECTORS_RETURNED,
} from '../../../common/constants';
import { createCaseError } from '../../common/error';
import type { CasesClientInternal } from '../client_internal';
import type { CasesClientArgs } from '../types';
import { getMappings } from './get_mappings';

import { Operations } from '../../authorization';
import { combineAuthorizedAndOwnerFilter } from '../utils';
import type { MappingsArgs, CreateMappingsArgs, UpdateMappingsArgs } from './types';
import { createMappings } from './create_mappings';
import { updateMappings } from './update_mappings';
import { ConfigurationRt, ConfigurationsRt } from '../../../common/types/domain';
import { validateDuplicatedCustomFieldKeysInRequest } from '../validators';
import { validateCustomFieldTypesInRequest } from './validators';

/**
 * Defines the internal helper functions.
 *
 * @ignore
 */
export interface InternalConfigureSubClient {
  getMappings(params: MappingsArgs): Promise<ConnectorMappingResponse | null>;
  createMappings(params: CreateMappingsArgs): Promise<ConnectorMappingResponse>;
  updateMappings(params: UpdateMappingsArgs): Promise<ConnectorMappingResponse>;
}

/**
 * This is the public API for interacting with the connector configuration for cases.
 */
export interface ConfigureSubClient {
  /**
   * Retrieves the external connector configuration for a particular case owner.
   */
  get(params?: GetConfigurationFindRequest): Promise<Configurations>;
  /**
   * Retrieves the valid external connectors supported by the cases plugin.
   */
  getConnectors(): Promise<FindActionResult[]>;

  /**
   * Updates a particular configuration with new values.
   *
   * @param configurationId the ID of the configuration to update
   * @param configurations the new configuration parameters
   */
  update(
    configurationId: string,
    configurations: ConfigurationPatchRequest
  ): Promise<Configuration>;

  /**
   * Creates a configuration if one does not already exist. If one exists it is deleted and a new one is created.
   */
  create(configuration: ConfigurationRequest): Promise<Configuration>;
}

/**
 * These functions should not be exposed on the plugin contract. They are for internal use to support the CRUD of
 * configurations.
 *
 * @ignore
 */
export const createInternalConfigurationSubClient = (
  clientArgs: CasesClientArgs
): InternalConfigureSubClient => {
  const configureSubClient: InternalConfigureSubClient = {
    getMappings: (params: MappingsArgs) => getMappings(params, clientArgs),
    createMappings: (params: CreateMappingsArgs) => createMappings(params, clientArgs),
    updateMappings: (params: UpdateMappingsArgs) => updateMappings(params, clientArgs),
  };

  return Object.freeze(configureSubClient);
};

/**
 * Creates an API object for interacting with the configuration entities
 *
 * @ignore
 */
export const createConfigurationSubClient = (
  clientArgs: CasesClientArgs,
  casesInternalClient: CasesClientInternal
): ConfigureSubClient => {
  return Object.freeze({
    get: (params?: GetConfigurationFindRequest) => get(params, clientArgs, casesInternalClient),
    getConnectors: () => getConnectors(clientArgs),
    update: (configurationId: string, configuration: ConfigurationPatchRequest) =>
      update(configurationId, configuration, clientArgs, casesInternalClient),
    create: (configuration: ConfigurationRequest) =>
      create(configuration, clientArgs, casesInternalClient),
  });
};

export async function get(
  params: GetConfigurationFindRequest = {},
  clientArgs: CasesClientArgs,
  casesClientInternal: CasesClientInternal
): Promise<Configurations> {
  const {
    unsecuredSavedObjectsClient,
    services: { caseConfigureService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const queryParams = decodeWithExcessOrThrow(GetConfigurationFindRequestRt)(params);

    const { filter: authorizationFilter, ensureSavedObjectsAreAuthorized } =
      await authorization.getAuthorizationFilter(Operations.findConfigurations);

    const filter = combineAuthorizedAndOwnerFilter(
      queryParams.owner,
      authorizationFilter,
      Operations.findConfigurations.savedObjectType
    );

    let error: string | null = null;
    const myCaseConfigure = await caseConfigureService.find({
      unsecuredSavedObjectsClient,
      options: { filter },
    });

    ensureSavedObjectsAreAuthorized(
      myCaseConfigure.saved_objects.map((configuration) => ({
        id: configuration.id,
        owner: configuration.attributes.owner,
      }))
    );

    const configurations = await pMap(
      myCaseConfigure.saved_objects,
      async (configuration: SavedObject<ConfigurationAttributes>) => {
        const { connector, ...caseConfigureWithoutConnector } = configuration?.attributes ?? {
          connector: null,
        };

        let mappings: ConnectorMappingResponse | null = null;

        if (connector != null) {
          try {
            mappings = await casesClientInternal.configuration.getMappings({
              connector,
            });
          } catch (e) {
            error = e.isBoom
              ? e.output.payload.message
              : `Failed to retrieve mapping for ${connector.name}`;
          }
        }

        return {
          ...caseConfigureWithoutConnector,
          connector,
          mappings: mappings != null ? mappings.mappings : [],
          version: configuration.version ?? '',
          error,
          id: configuration.id,
        };
      }
    );

    return decodeOrThrow(ConfigurationsRt)(configurations);
  } catch (error) {
    throw createCaseError({ message: `Failed to get case configure: ${error}`, error, logger });
  }
}

export async function getConnectors({
  actionsClient,
  logger,
}: CasesClientArgs): Promise<FindActionResult[]> {
  try {
    const actionTypes = (await actionsClient.listTypes()).reduce((types, type) => {
      types[type.id] = type;
      return types;
    }, {} as Record<string, ActionType>);

    const res = (await actionsClient.getAll())
      .filter((action) => isConnectorSupported(action, actionTypes))
      .slice(0, MAX_SUPPORTED_CONNECTORS_RETURNED);

    return decodeOrThrow(FindActionConnectorResponseRt)(res);
  } catch (error) {
    throw createCaseError({ message: `Failed to get connectors: ${error}`, error, logger });
  }
}

function isConnectorSupported(
  action: FindActionResult,
  actionTypes: Record<string, ActionType>
): boolean {
  return (
    (actionTypes[action.actionTypeId]?.supportedFeatureIds ?? []).includes(
      CasesConnectorFeatureId
    ) && actionTypes[action.actionTypeId]?.enabledInLicense
  );
}

export async function update(
  configurationId: string,
  req: ConfigurationPatchRequest,
  clientArgs: CasesClientArgs,
  casesClientInternal: CasesClientInternal
): Promise<Configuration> {
  const {
    services: { caseConfigureService },
    logger,
    unsecuredSavedObjectsClient,
    user,
    authorization,
  } = clientArgs;

  try {
    const request = decodeWithExcessOrThrow(ConfigurationPatchRequestRt)(req);

    validateDuplicatedCustomFieldKeysInRequest({ requestCustomFields: request.customFields });

    const { version, ...queryWithoutVersion } = request;

    const configuration = await caseConfigureService.get({
      unsecuredSavedObjectsClient,
      configurationId,
    });

    validateCustomFieldTypesInRequest({
      requestCustomFields: request.customFields,
      originalCustomFields: configuration.attributes.customFields,
    });

    await authorization.ensureAuthorized({
      operation: Operations.updateConfiguration,
      entities: [{ owner: configuration.attributes.owner, id: configuration.id }],
    });

    if (version !== configuration.version) {
      throw Boom.conflict(
        'This configuration has been updated. Please refresh before saving additional updates.'
      );
    }

    let error = null;
    const updateDate = new Date().toISOString();
    let mappings: ConnectorMappings = [];
    const { connector, ...queryWithoutVersionAndConnector } = queryWithoutVersion;

    try {
      const resMappings = await casesClientInternal.configuration.getMappings({
        connector: connector != null ? connector : configuration.attributes.connector,
      });

      mappings = resMappings !== null ? resMappings.mappings : [];

      if (connector != null) {
        if (resMappings !== null) {
          mappings = (
            await casesClientInternal.configuration.updateMappings({
              connector,
              mappingId: resMappings.id,
              refresh: false,
            })
          ).mappings;
        } else {
          mappings = (
            await casesClientInternal.configuration.createMappings({
              connector,
              owner: configuration.attributes.owner,
              refresh: false,
            })
          ).mappings;
        }
      }
    } catch (e) {
      error = e.isBoom
        ? e.output.payload.message
        : `Error creating mapping for ${
            connector != null ? connector.name : configuration.attributes.connector.name
          }`;
    }

    const patch = await caseConfigureService.patch({
      unsecuredSavedObjectsClient,
      configurationId: configuration.id,
      updatedAttributes: {
        ...queryWithoutVersionAndConnector,
        ...(connector != null && { connector }),
        updated_at: updateDate,
        updated_by: user,
      },
      originalConfiguration: configuration,
    });

    const res = {
      ...configuration.attributes,
      ...patch.attributes,
      connector: patch.attributes.connector ?? configuration.attributes.connector,
      mappings,
      version: patch.version ?? '',
      error,
      id: patch.id,
    };

    return decodeOrThrow(ConfigurationRt)(res);
  } catch (error) {
    throw createCaseError({
      message: `Failed to get patch configure in route: ${error}`,
      error,
      logger,
    });
  }
}

export async function create(
  configRequest: ConfigurationRequest,
  clientArgs: CasesClientArgs,
  casesClientInternal: CasesClientInternal
): Promise<Configuration> {
  const {
    unsecuredSavedObjectsClient,
    services: { caseConfigureService },
    logger,
    user,
    authorization,
  } = clientArgs;

  try {
    const validatedConfigurationRequest =
      decodeWithExcessOrThrow(ConfigurationRequestRt)(configRequest);

    validateDuplicatedCustomFieldKeysInRequest({
      requestCustomFields: validatedConfigurationRequest.customFields,
    });

    let error = null;

    const { filter: authorizationFilter, ensureSavedObjectsAreAuthorized } =
      await authorization.getAuthorizationFilter(
        /**
         * The operation is createConfiguration because the procedure is part of
         * the create route. The user should have all
         * permissions to delete the results.
         */
        Operations.createConfiguration
      );

    const filter = combineAuthorizedAndOwnerFilter(
      validatedConfigurationRequest.owner,
      authorizationFilter,
      Operations.createConfiguration.savedObjectType
    );

    const myCaseConfigure = await caseConfigureService.find({
      unsecuredSavedObjectsClient,
      options: { filter },
    });

    ensureSavedObjectsAreAuthorized(
      myCaseConfigure.saved_objects.map((conf) => ({
        id: conf.id,
        owner: conf.attributes.owner,
      }))
    );

    if (myCaseConfigure.saved_objects.length > 0) {
      const deleteConfigurationMapper = async (c: SavedObject<ConfigurationAttributes>) =>
        caseConfigureService.delete({
          unsecuredSavedObjectsClient,
          configurationId: c.id,
          refresh: false,
        });

      // Ensuring we don't too many concurrent deletions running.
      await pMap(myCaseConfigure.saved_objects, deleteConfigurationMapper, {
        concurrency: MAX_CONCURRENT_SEARCHES,
      });
    }

    const savedObjectID = SavedObjectsUtils.generateId();

    await authorization.ensureAuthorized({
      operation: Operations.createConfiguration,
      entities: [{ owner: validatedConfigurationRequest.owner, id: savedObjectID }],
    });

    const creationDate = new Date().toISOString();
    let mappings: ConnectorMappings = [];

    try {
      mappings = (
        await casesClientInternal.configuration.createMappings({
          connector: validatedConfigurationRequest.connector,
          owner: validatedConfigurationRequest.owner,
          refresh: false,
        })
      ).mappings;
    } catch (e) {
      error = e.isBoom
        ? e.output.payload.message
        : `Error creating mapping for ${validatedConfigurationRequest.connector.name}`;
    }

    const post = await caseConfigureService.post({
      unsecuredSavedObjectsClient,
      attributes: {
        ...validatedConfigurationRequest,
        customFields: validatedConfigurationRequest.customFields ?? [],
        connector: validatedConfigurationRequest.connector,
        created_at: creationDate,
        created_by: user,
        updated_at: null,
        updated_by: null,
      },
      id: savedObjectID,
    });

    const res = {
      ...post.attributes,
      // Reserve for future implementations
      connector: post.attributes.connector,
      mappings,
      version: post.version ?? '',
      error,
      id: post.id,
    };

    return decodeOrThrow(ConfigurationRt)(res);
  } catch (error) {
    throw createCaseError({
      message: `Failed to create case configuration: ${error}`,
      error,
      logger,
    });
  }
}
