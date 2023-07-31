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
import { findConnectorsSo, searchConnectorsSo } from '../../../data/connector';
import { FindConnectorResult, GetAllParams, InjectExtraFindDataParams } from './types';
import { ConnectorAuditAction, connectorAuditEvent } from '../../../lib/audit_events';
import { actionFromSavedObject, isConnectorDeprecated } from '../lib';

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
    actionFromSavedObject(rawAction, isConnectorDeprecated(rawAction.attributes))
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
  return await injectExtraFindData({
    kibanaIndices: context.kibanaIndices,
    scopedClusterClient: context.scopedClusterClient,
    connectorResults: mergedResult,
  });
}

async function injectExtraFindData({
  kibanaIndices,
  scopedClusterClient,
  connectorResults,
}: InjectExtraFindDataParams): Promise<FindConnectorResult[]> {
  const aggs: Record<string, estypes.AggregationsAggregationContainer> = {};
  for (const connectorResult of connectorResults) {
    aggs[connectorResult.id] = {
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
                            'references.id': connectorResult.id,
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

  return connectorResults.map((actionResult) => ({
    ...actionResult,
    // @ts-expect-error aggegation type is not specified
    referencedByCount: aggregationResult.aggregations[actionResult.id].doc_count,
  }));
}
