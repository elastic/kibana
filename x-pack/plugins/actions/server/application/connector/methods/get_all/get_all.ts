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
import { connectorSchema } from '../../schemas';
import { findConnectorsSo, searchConnectorsSo } from '../../../../data/connector';
import { GetAllParams, InjectExtraFindDataParams } from './types';
import { ConnectorAuditAction, connectorAuditEvent } from '../../../../lib/audit_events';
import { connectorFromSavedObject, isConnectorDeprecated } from '../../lib';
import { FindConnectorResult } from '../../types';

export async function getAll({
  context,
  includeSystemActions = false,
}: GetAllParams): Promise<FindConnectorResult[]> {
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

  const savedObjectsActions = (
    await findConnectorsSo({ unsecuredSavedObjectsClient: context.unsecuredSavedObjectsClient })
  ).saved_objects.map((rawAction) =>
    connectorFromSavedObject(rawAction, isConnectorDeprecated(rawAction.attributes))
  );

  savedObjectsActions.forEach(({ id }) =>
    context.auditLogger?.log(
      connectorAuditEvent({
        action: ConnectorAuditAction.FIND,
        savedObject: { type: 'action', id },
      })
    )
  );

  const inMemoryConnectorsFiltered = includeSystemActions
    ? context.inMemoryConnectors
    : context.inMemoryConnectors.filter((connector) => !connector.isSystemAction);

  const mergedResult = [
    ...savedObjectsActions,
    ...inMemoryConnectorsFiltered.map((inMemoryConnector) => ({
      id: inMemoryConnector.id,
      actionTypeId: inMemoryConnector.actionTypeId,
      name: inMemoryConnector.name,
      isPreconfigured: inMemoryConnector.isPreconfigured,
      isDeprecated: isConnectorDeprecated(inMemoryConnector),
      isSystemAction: inMemoryConnector.isSystemAction,
    })),
  ].sort((a, b) => a.name.localeCompare(b.name));

  mergedResult.forEach((connector) => {
    // Try to validate the connectors, but don't throw.
    try {
      connectorSchema.validate(connector);
    } catch (e) {
      context.logger.warn(`Error validating connector: ${connector.id}, ${e}`);
    }
  });

  return await injectExtraFindData({
    kibanaIndices: context.kibanaIndices,
    scopedClusterClient: context.scopedClusterClient,
    connectors: mergedResult,
  });
}

async function injectExtraFindData({
  kibanaIndices,
  scopedClusterClient,
  connectors,
}: InjectExtraFindDataParams): Promise<FindConnectorResult[]> {
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

  const aggregationResult = await searchConnectorsSo({ scopedClusterClient, kibanaIndices, aggs });

  return connectors.map((connector) => ({
    ...connector,
    // @ts-expect-error aggegation type is not specified
    referencedByCount: aggregationResult.aggregations[connector.id].doc_count,
  }));
}
