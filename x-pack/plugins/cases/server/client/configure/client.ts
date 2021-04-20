/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';

import { SavedObjectsUtils } from '../../../../../../src/core/server';
import { SUPPORTED_CONNECTORS } from '../../../common/constants';
import {
  CaseConfigureResponseRt,
  CasesConfigurePatch,
  CasesConfigureRequest,
  CasesConfigureResponse,
  ConnectorMappingsAttributes,
  GetFieldsResponse,
} from '../../../common/api';
import { createCaseError } from '../../common/error';
import {
  transformCaseConnectorToEsConnector,
  transformESConnectorToCaseConnector,
} from '../../common';
import { EventOutcome } from '../../../../security/server';
import { CasesClientInternal } from '../client_internal';
import { CasesClientArgs } from '../types';
import { getFields } from './get_fields';
import { getMappings } from './get_mappings';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { FindActionResult } from '../../../../actions/server/types';
import { ActionType } from '../../../../actions/common';
import { Operations } from '../../authorization';
import { createAuditMsg, ensureAuthorized } from '../utils';

interface ConfigurationGetFields {
  connectorId: string;
  connectorType: string;
}

interface ConfigurationGetMappings {
  connectorId: string;
  connectorType: string;
}

/**
 * Defines the internal helper functions.
 */
export interface InternalConfigureSubClient {
  getFields(params: ConfigurationGetFields): Promise<GetFieldsResponse>;
  getMappings(params: ConfigurationGetMappings): Promise<ConnectorMappingsAttributes[]>;
}

/**
 * This is the public API for interacting with the connector configuration for cases.
 */
export interface ConfigureSubClient {
  get(): Promise<CasesConfigureResponse | {}>;
  getConnectors(): Promise<FindActionResult[]>;
  update(configurations: CasesConfigurePatch): Promise<CasesConfigureResponse>;
  create(configuration: CasesConfigureRequest): Promise<CasesConfigureResponse>;
}

/**
 * These functions should not be exposed on the plugin contract. They are for internal use to support the CRUD of
 * configurations.
 */
export const createInternalConfigurationSubClient = (
  clientArgs: CasesClientArgs,
  casesClientInternal: CasesClientInternal
): InternalConfigureSubClient => {
  const configureSubClient: InternalConfigureSubClient = {
    getFields: (params: ConfigurationGetFields) => getFields(params, clientArgs),
    getMappings: (params: ConfigurationGetMappings) =>
      getMappings(params, clientArgs, casesClientInternal),
  };

  return Object.freeze(configureSubClient);
};

export const createConfigurationSubClient = (
  clientArgs: CasesClientArgs,
  casesInternalClient: CasesClientInternal
): ConfigureSubClient => {
  return Object.freeze({
    get: () => get(clientArgs, casesInternalClient),
    getConnectors: () => getConnectors(clientArgs),
    update: (configuration: CasesConfigurePatch) =>
      update(configuration, clientArgs, casesInternalClient),
    create: (configuration: CasesConfigureRequest) =>
      create(configuration, clientArgs, casesInternalClient),
  });
};

async function get(
  clientArgs: CasesClientArgs,
  casesClientInternal: CasesClientInternal
): Promise<CasesConfigureResponse | {}> {
  const { savedObjectsClient: soClient, caseConfigureService, logger } = clientArgs;
  try {
    let error: string | null = null;
    const myCaseConfigure = await caseConfigureService.find({ soClient });
    const { connector, ...caseConfigureWithoutConnector } = myCaseConfigure.saved_objects[0]
      ?.attributes ?? { connector: null };
    let mappings: ConnectorMappingsAttributes[] = [];

    if (connector != null) {
      try {
        mappings = await casesClientInternal.configuration.getMappings({
          connectorId: connector.id,
          connectorType: connector.type,
        });
      } catch (e) {
        error = e.isBoom
          ? e.output.payload.message
          : `Error connecting to ${connector.name} instance`;
      }
    }

    return myCaseConfigure.saved_objects.length > 0
      ? CaseConfigureResponseRt.encode({
          ...caseConfigureWithoutConnector,
          connector: transformESConnectorToCaseConnector(connector),
          mappings,
          version: myCaseConfigure.saved_objects[0].version ?? '',
          error,
        })
      : {};
  } catch (error) {
    throw createCaseError({ message: `Failed to get case configure: ${error}`, error, logger });
  }
}

async function getConnectors({
  actionsClient,
  logger,
}: CasesClientArgs): Promise<FindActionResult[]> {
  const isConnectorSupported = (
    action: FindActionResult,
    actionTypes: Record<string, ActionType>
  ): boolean =>
    SUPPORTED_CONNECTORS.includes(action.actionTypeId) &&
    actionTypes[action.actionTypeId]?.enabledInLicense;

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

async function update(
  configurations: CasesConfigurePatch,
  clientArgs: CasesClientArgs,
  casesClientInternal: CasesClientInternal
): Promise<CasesConfigureResponse> {
  const { caseConfigureService, logger, savedObjectsClient: soClient, user } = clientArgs;

  try {
    let error = null;

    const myCaseConfigure = await caseConfigureService.find({ soClient });
    const { version, connector, ...queryWithoutVersion } = configurations;
    if (myCaseConfigure.saved_objects.length === 0) {
      throw Boom.conflict(
        'You can not patch this configuration since you did not created first with a post.'
      );
    }

    if (version !== myCaseConfigure.saved_objects[0].version) {
      throw Boom.conflict(
        'This configuration has been updated. Please refresh before saving additional updates.'
      );
    }

    const updateDate = new Date().toISOString();

    let mappings: ConnectorMappingsAttributes[] = [];
    if (connector != null) {
      try {
        mappings = await casesClientInternal.configuration.getMappings({
          connectorId: connector.id,
          connectorType: connector.type,
        });
      } catch (e) {
        error = e.isBoom
          ? e.output.payload.message
          : `Error connecting to ${connector.name} instance`;
      }
    }
    const patch = await caseConfigureService.patch({
      soClient,
      caseConfigureId: myCaseConfigure.saved_objects[0].id,
      updatedAttributes: {
        ...queryWithoutVersion,
        ...(connector != null ? { connector: transformCaseConnectorToEsConnector(connector) } : {}),
        updated_at: updateDate,
        updated_by: user,
      },
    });
    return CaseConfigureResponseRt.encode({
      ...myCaseConfigure.saved_objects[0].attributes,
      ...patch.attributes,
      connector: transformESConnectorToCaseConnector(
        patch.attributes.connector ?? myCaseConfigure.saved_objects[0].attributes.connector
      ),
      mappings,
      version: patch.version ?? '',
      error,
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
  const {
    savedObjectsClient: soClient,
    caseConfigureService,
    logger,
    user,
    authorization,
    auditLogger,
  } = clientArgs;
  try {
    let error = null;

    const savedObjectID = SavedObjectsUtils.generateId();

    await ensureAuthorized({
      operation: Operations.createConfiguration,
      owners: [configuration.owner],
      authorization,
      auditLogger,
      savedObjectIDs: [savedObjectID],
    });

    // log that we're attempting to create a configuration
    auditLogger?.log(
      createAuditMsg({
        operation: Operations.createConfiguration,
        outcome: EventOutcome.UNKNOWN,
        savedObjectID,
      })
    );

    const myCaseConfigure = await caseConfigureService.find({ soClient });
    if (myCaseConfigure.saved_objects.length > 0) {
      await Promise.all(
        myCaseConfigure.saved_objects.map((cc) =>
          caseConfigureService.delete({ soClient, caseConfigureId: cc.id })
        )
      );
    }

    const creationDate = new Date().toISOString();
    let mappings: ConnectorMappingsAttributes[] = [];
    try {
      mappings = await casesClientInternal.configuration.getMappings({
        connectorId: configuration.connector.id,
        connectorType: configuration.connector.type,
      });
    } catch (e) {
      error = e.isBoom
        ? e.output.payload.message
        : `Error connecting to ${configuration.connector.name} instance`;
    }

    const post = await caseConfigureService.post({
      soClient,
      attributes: {
        ...configuration,
        connector: transformCaseConnectorToEsConnector(configuration.connector),
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
      connector: transformESConnectorToCaseConnector(post.attributes.connector),
      mappings,
      version: post.version ?? '',
      error,
    });
  } catch (error) {
    throw createCaseError({
      message: `Failed to create case configuration: ${error}`,
      error,
      logger,
    });
  }
}
