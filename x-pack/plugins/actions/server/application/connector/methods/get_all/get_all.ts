/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Get all actions with in-memory connectors
 */
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { AuditLogger } from '@kbn/security-plugin-types-server';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { omit } from 'lodash';
import { InMemoryConnector } from '../../../..';
import { SavedObjectClientForFind } from '../../../../data/connector/types/params';
import { connectorWithExtraFindDataSchema } from '../../schemas';
import { findConnectorsSo, searchConnectorsSo } from '../../../../data/connector';
import { GetAllParams, InjectExtraFindDataParams } from './types';
import { ConnectorAuditAction, connectorAuditEvent } from '../../../../lib/audit_events';
import { connectorFromSavedObject, isConnectorDeprecated } from '../../lib';
import { ConnectorWithExtraFindData } from '../../types';
import { GetAllUnsecuredParams } from './types/params';

interface GetAllHelperOpts {
  auditLogger?: AuditLogger;
  esClient: ElasticsearchClient;
  inMemoryConnectors: InMemoryConnector[];
  kibanaIndices: string[];
  logger: Logger;
  namespace?: string;
  savedObjectsClient: SavedObjectClientForFind;
}

export async function getAll({
  context,
  includeSystemActions = false,
}: GetAllParams): Promise<ConnectorWithExtraFindData[]> {
  try {
    await context.authorization.ensureAuthorized({ operation: 'get' });
  } catch (error) {
    context.auditLogger?.log(
      connectorAuditEvent({
        action: ConnectorAuditAction.FIND,
        error,
      })
    );
    throw error;
  }

  return await getAllHelper({
    auditLogger: context.auditLogger,
    esClient: context.scopedClusterClient.asInternalUser,
    inMemoryConnectors: includeSystemActions
      ? context.inMemoryConnectors
      : context.inMemoryConnectors.filter((connector) => !connector.isSystemAction),
    kibanaIndices: context.kibanaIndices,
    logger: context.logger,
    savedObjectsClient: context.unsecuredSavedObjectsClient,
  });
}

export async function getAllUnsecured({
  esClient,
  inMemoryConnectors,
  internalSavedObjectsRepository,
  kibanaIndices,
  logger,
  spaceId,
}: GetAllUnsecuredParams): Promise<ConnectorWithExtraFindData[]> {
  const namespace = spaceId && spaceId !== 'default' ? spaceId : undefined;

  const connectors = await getAllHelper({
    esClient,
    // Unsecured execution does not currently support system actions so we filter them out
    inMemoryConnectors: inMemoryConnectors.filter((connector) => !connector.isSystemAction),
    kibanaIndices,
    logger,
    namespace,
    savedObjectsClient: internalSavedObjectsRepository,
  });

  return connectors.map((connector) => omit(connector, 'secrets'));
}

async function getAllHelper({
  auditLogger,
  esClient,
  inMemoryConnectors,
  kibanaIndices,
  logger,
  namespace,
  savedObjectsClient,
}: GetAllHelperOpts): Promise<ConnectorWithExtraFindData[]> {
  const savedObjectsActions = (
    await findConnectorsSo({ savedObjectsClient, namespace })
  ).saved_objects.map((rawAction) =>
    connectorFromSavedObject(rawAction, isConnectorDeprecated(rawAction.attributes))
  );

  if (auditLogger) {
    savedObjectsActions.forEach(({ id }) =>
      auditLogger.log(
        connectorAuditEvent({
          action: ConnectorAuditAction.FIND,
          savedObject: { type: 'action', id },
        })
      )
    );
  }

  const mergedResult = [
    ...savedObjectsActions,
    ...inMemoryConnectors.map((inMemoryConnector) => ({
      id: inMemoryConnector.id,
      actionTypeId: inMemoryConnector.actionTypeId,
      name: inMemoryConnector.name,
      isPreconfigured: inMemoryConnector.isPreconfigured,
      isDeprecated: isConnectorDeprecated(inMemoryConnector),
      isSystemAction: inMemoryConnector.isSystemAction,
    })),
  ].sort((a, b) => a.name.localeCompare(b.name));

  const connectors = await injectExtraFindData({
    kibanaIndices,
    esClient,
    connectors: mergedResult,
  });

  validateConnectors(connectors, logger);

  return connectors;
}

const validateConnectors = (connectors: ConnectorWithExtraFindData[], logger: Logger) => {
  connectors.forEach((connector) => {
    // Try to validate the connectors, but don't throw.
    try {
      connectorWithExtraFindDataSchema.validate(connector);
    } catch (e) {
      logger.warn(`Error validating connector: ${connector.id}, ${e}`);
    }
  });
};

export async function getAllSystemConnectors({
  context,
}: {
  context: GetAllParams['context'];
}): Promise<ConnectorWithExtraFindData[]> {
  try {
    await context.authorization.ensureAuthorized({ operation: 'get' });
  } catch (error) {
    context.auditLogger?.log(
      connectorAuditEvent({
        action: ConnectorAuditAction.FIND,
        error,
      })
    );

    throw error;
  }

  const systemConnectors = context.inMemoryConnectors.filter(
    (connector) => connector.isSystemAction
  );

  const transformedSystemConnectors = systemConnectors
    .map((systemConnector) => ({
      id: systemConnector.id,
      actionTypeId: systemConnector.actionTypeId,
      name: systemConnector.name,
      isPreconfigured: systemConnector.isPreconfigured,
      isDeprecated: isConnectorDeprecated(systemConnector),
      isSystemAction: systemConnector.isSystemAction,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const connectors = await injectExtraFindData({
    kibanaIndices: context.kibanaIndices,
    esClient: context.scopedClusterClient.asInternalUser,
    connectors: transformedSystemConnectors,
  });

  validateConnectors(connectors, context.logger);

  return connectors;
}

async function injectExtraFindData({
  kibanaIndices,
  esClient,
  connectors,
}: InjectExtraFindDataParams): Promise<ConnectorWithExtraFindData[]> {
  const aggs: Record<string, estypes.AggregationsAggregationContainer> = {};
  for (const connector of connectors) {
    aggs[connector.id] = {
      filter: {
        bool: {
          must: {
            nested: {
              path: 'references',
              query: {
                bool: {
                  filter: {
                    bool: {
                      must: [
                        {
                          term: {
                            'references.id': connector.id,
                          },
                        },
                        {
                          term: {
                            'references.type': 'action',
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
  }

  const aggregationResult = await searchConnectorsSo({ esClient, kibanaIndices, aggs });

  return connectors.map((connector) => ({
    ...connector,
    // @ts-expect-error aggegation type is not specified
    referencedByCount: aggregationResult.aggregations[connector.id].doc_count,
  }));
}
