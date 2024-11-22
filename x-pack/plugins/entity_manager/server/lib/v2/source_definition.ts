/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObservabilityElasticsearchClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { DEFINITIONS_ALIAS, TEMPLATE_VERSION } from './constants';
import { EntitySourceDefinition, OperationStatus, StoredEntitySourceDefinition } from './types';

export async function storeSourceDefinition(
  source: EntitySourceDefinition,
  esClient: ObservabilityElasticsearchClient
): Promise<OperationStatus<EntitySourceDefinition>> {
  try {
    const result = await esClient.esql('fetch source definition for conflict check', {
      query: `FROM ${DEFINITIONS_ALIAS} METADATA _id | WHERE definition_type == "source" AND _id == "source:${source.id}"`,
    });

    if (result.length !== 0) {
      return {
        status: 'conflict',
        reason: `An entity source definition with the ID "${source.id}" already exists.`,
      };
    }

    const definition: StoredEntitySourceDefinition = {
      template_version: TEMPLATE_VERSION,
      definition_type: 'source',
      source,
    };

    await esClient.client.index({
      index: DEFINITIONS_ALIAS,
      id: `source:${definition.source.id}`,
      document: definition,
    });

    return {
      status: 'success',
      resource: definition.source,
    };
  } catch (error) {
    return {
      status: 'error',
      reason: `${error.name}: ${error.message}`,
    };
  }
}

export async function readSourceDefinitions(
  esClient: ObservabilityElasticsearchClient
): Promise<OperationStatus<EntitySourceDefinition[]>> {
  try {
    const sources = await esClient.esql<StoredEntitySourceDefinition>(
      'fetch all source definitions',
      {
        query: `FROM ${DEFINITIONS_ALIAS} | WHERE definition_type == "source"`,
      }
    );

    return {
      status: 'success',
      resource: sources.map((storedTypeDefinition) => storedTypeDefinition.source),
    };
  } catch (error) {
    return {
      status: 'error',
      reason: `${error.name}: ${error.message}`,
    };
  }
}
