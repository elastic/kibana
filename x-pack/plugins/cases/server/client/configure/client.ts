/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import Boom from '@hapi/boom';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import { SavedObject, SavedObjectsFindResponse, SavedObjectsUtils } from '@kbn/core/server';
import { FindActionResult } from '@kbn/actions-plugin/server/types';
import { ActionType } from '@kbn/actions-plugin/common';
import {
  CaseConfigurationsResponseRt,
  CaseConfigureResponseRt,
  CasesConfigurationsResponse,
  CasesConfigureAttributes,
  CasesConfigurePatch,
  CasesConfigurePatchRt,
  CasesConfigureRequest,
  CasesConfigureResponse,
  ConnectorMappings,
  ConnectorMappingsAttributes,
  excess,
  GetConfigureFindRequest,
  GetConfigureFindRequestRt,
  throwErrors,
} from '../../../common/api';
import { MAX_CONCURRENT_SEARCHES, SUPPORTED_CONNECTORS } from '../../../common/constants';
import { createCaseError } from '../../common/error';
import { CasesClientInternal } from '../client_internal';
import { CasesClientArgs } from '../types';
import { getMappings } from './get_mappings';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { Operations } from '../../authorization';
import { combineAuthorizedAndOwnerFilter } from '../utils';
import { MappingsArgs, CreateMappingsArgs, UpdateMappingsArgs } from './types';
import { createMappings } from './create_mappings';
import { updateMappings } from './update_mappings';
import {
  ICasesConfigurePatch,
  ICasesConfigureRequest,
  ICasesConfigureResponse,
} from '../typedoc_interfaces';

/**
 * Defines the internal helper functions.
 *
 * @ignore
 */
export interface InternalConfigureSubClient {
  getMappings(
    params: MappingsArgs
  ): Promise<SavedObjectsFindResponse<ConnectorMappings>['saved_objects']>;
  createMappings(params: CreateMappingsArgs): Promise<ConnectorMappingsAttributes[]>;
  updateMappings(params: UpdateMappingsArgs): Promise<ConnectorMappingsAttributes[]>;
}

/**
 * This is the public API for interacting with the connector configuration for cases.
 */
export interface ConfigureSubClient {
  /**
   * Retrieves the external connector configuration for a particular case owner.
   */
  get(params: GetConfigureFindRequest): Promise<ICasesConfigureResponse | {}>;
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
    configurations: ICasesConfigurePatch
  ): Promise<ICasesConfigureResponse>;
  /**
   * Creates a configuration if one does not already exist. If one exists it is deleted and a new one is created.
   */
  create(configuration: ICasesConfigureRequest): Promise<ICasesConfigureResponse>;
}

/**
 * These functions should not be exposed on the plugin contract. They are for internal use to support the CRUD of
 * configurations.
 *
 * @ignore
 */
export const createInternalConfigurationSubClient = (
  clientArgs: CasesClientArgs,
  casesClientInternal: CasesClientInternal
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
    get: (params: GetConfigureFindRequest) => get(params, clientArgs, casesInternalClient),
    getConnectors: () => getConnectors(clientArgs),
    update: (configurationId: string, configuration: CasesConfigurePatch) =>
      update(configurationId, configuration, clientArgs, casesInternalClient),
    create: (configuration: CasesConfigureRequest) =>
      create(configuration, clientArgs, casesInternalClient),
  });
};

async function get(
  params: GetConfigureFindRequest,
  clientArgs: CasesClientArgs,
  casesClientInternal: CasesClientInternal
): Promise<CasesConfigurationsResponse> {
  const { unsecuredSavedObjectsClient, caseConfigureService, logger, authorization } = clientArgs;
  try {
    const queryParams = pipe(
      excess(GetConfigureFindRequestRt).decode(params),
      fold(throwErrors(Boom.badRequest), identity)
    );

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
      async (configuration: SavedObject<CasesConfigureAttributes>) => {
        const { connector, ...caseConfigureWithoutConnector } = configuration?.attributes ?? {
          connector: null,
        };

        let mappings: SavedObjectsFindResponse<ConnectorMappings>['saved_objects'] = [];

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
          mappings: mappings.length > 0 ? mappings[0].attributes.mappings : [],
          version: configuration.version ?? '',
          error,
          id: configuration.id,
        };
      }
    );

    return CaseConfigurationsResponseRt.encode(configurations);
  } catch (error) {
    throw createCaseError({ message: `Failed to get case configure: ${error}`, error, logger });
  }
}

export async function getConnectors({
  actionsClient,
  logger,
}: CasesClientArgs): Promise<FindActionResult[]> {
  try {
    const actionTypes = (await actionsClient.listTypes()).reduce(
      (types, type) => ({ ...types, [type.id]: type }),
      {}
    );

    return (await actionsClient.getAll()).filter((action) =>
      isConnectorSupported(action, actionTypes)
    );
  } catch (error) {
    throw createCaseError({ message: `Failed to get connectors: ${error}`, error, logger });
  }
}

function isConnectorSupported(
  action: FindActionResult,
  actionTypes: Record<string, ActionType>
): boolean {
  return (
    SUPPORTED_CONNECTORS.includes(action.actionTypeId) &&
    actionTypes[action.actionTypeId]?.enabledInLicense &&
    action.config != null &&
    !action.isPreconfigured
  );
}

async function update(
  configurationId: string,
  req: CasesConfigurePatch,
  clientArgs: CasesClientArgs,
  casesClientInternal: CasesClientInternal
): Promise<CasesConfigureResponse> {
  const { caseConfigureService, logger, unsecuredSavedObjectsClient, user, authorization } =
    clientArgs;

  try {
    const request = pipe(
      CasesConfigurePatchRt.decode(req),
      fold(throwErrors(Boom.badRequest), identity)
    );

    const { version, ...queryWithoutVersion } = request;

    /**
     * Excess function does not supports union or intersection types.
     * For that reason we need to check manually for excess properties
     * in the partial attributes.
     *
     * The owner attribute should not be allowed.
     */
    pipe(
      excess(CasesConfigurePatchRt.types[0]).decode(queryWithoutVersion),
      fold(throwErrors(Boom.badRequest), identity)
    );

    const configuration = await caseConfigureService.get({
      unsecuredSavedObjectsClient,
      configurationId,
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
    let mappings: ConnectorMappingsAttributes[] = [];
    const { connector, ...queryWithoutVersionAndConnector } = queryWithoutVersion;

    try {
      const resMappings = await casesClientInternal.configuration.getMappings({
        connector: connector != null ? connector : configuration.attributes.connector,
      });

      mappings = resMappings.length > 0 ? resMappings[0].attributes.mappings : [];

      if (connector != null) {
        if (resMappings.length !== 0) {
          mappings = await casesClientInternal.configuration.updateMappings({
            connector,
            mappingId: resMappings[0].id,
          });
        } else {
          mappings = await casesClientInternal.configuration.createMappings({
            connector,
            owner: configuration.attributes.owner,
          });
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

    return CaseConfigureResponseRt.encode({
      ...configuration.attributes,
      ...patch.attributes,
      connector: patch.attributes.connector ?? configuration.attributes.connector,
      mappings,
      version: patch.version ?? '',
      error,
      id: patch.id,
    });
  } catch (error) {
    throw createCaseError({
      message: `Failed to get patch configure in route: ${error}`,
      error,
      logger,
    });
  }
}

async function create(
  configuration: CasesConfigureRequest,
  clientArgs: CasesClientArgs,
  casesClientInternal: CasesClientInternal
): Promise<CasesConfigureResponse> {
  const { unsecuredSavedObjectsClient, caseConfigureService, logger, user, authorization } =
    clientArgs;
  try {
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
      configuration.owner,
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
      const deleteConfigurationMapper = async (c: SavedObject<CasesConfigureAttributes>) =>
        caseConfigureService.delete({ unsecuredSavedObjectsClient, configurationId: c.id });

      // Ensuring we don't too many concurrent deletions running.
      await pMap(myCaseConfigure.saved_objects, deleteConfigurationMapper, {
        concurrency: MAX_CONCURRENT_SEARCHES,
      });
    }

    const savedObjectID = SavedObjectsUtils.generateId();

    await authorization.ensureAuthorized({
      operation: Operations.createConfiguration,
      entities: [{ owner: configuration.owner, id: savedObjectID }],
    });

    const creationDate = new Date().toISOString();
    let mappings: ConnectorMappingsAttributes[] = [];

    try {
      mappings = await casesClientInternal.configuration.createMappings({
        connector: configuration.connector,
        owner: configuration.owner,
      });
    } catch (e) {
      error = e.isBoom
        ? e.output.payload.message
        : `Error creating mapping for ${configuration.connector.name}`;
    }

    const post = await caseConfigureService.post({
      unsecuredSavedObjectsClient,
      attributes: {
        ...configuration,
        connector: configuration.connector,
        created_at: creationDate,
        created_by: user,
        updated_at: null,
        updated_by: null,
      },
      id: savedObjectID,
    });

    return CaseConfigureResponseRt.encode({
      ...post.attributes,
      // Reserve for future implementations
      connector: post.attributes.connector,
      mappings,
      version: post.version ?? '',
      error,
      id: post.id,
    });
  } catch (error) {
    throw createCaseError({
      message: `Failed to create case configuration: ${error}`,
      error,
      logger,
    });
  }
}
