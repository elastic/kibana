/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObservabilityElasticsearchClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { DEFINITIONS_ALIAS, TEMPLATE_VERSION } from './constants';
import { EntityTypeDefinition, OperationStatus, StoredEntityTypeDefinition } from './types';

export async function storeTypeDefinition(
  type: EntityTypeDefinition,
  esClient: ObservabilityElasticsearchClient
): Promise<OperationStatus<EntityTypeDefinition>> {
  try {
    const result = await esClient.esql('fetch type definition for conflict check', {
      query: `FROM ${DEFINITIONS_ALIAS} METADATA _id | WHERE definition_type == "type" AND _id == "type:${type.id}"`,
    });

    if (result.length !== 0) {
      return {
        status: 'conflict',
        reason: `An entity type definition with the ID "${type.id}" already exists.`,
      };
    }

    const definition: StoredEntityTypeDefinition = {
      template_version: TEMPLATE_VERSION,
      definition_type: 'type',
      type,
    };

    await esClient.client.index({
      index: DEFINITIONS_ALIAS,
      id: `type:${definition.type.id}`,
      document: definition,
    });

    return {
      status: 'success',
      resource: definition.type,
    };
  } catch (error) {
    return {
      status: 'error',
      reason: `${error.name}: ${error.message}`,
    };
  }
}

export async function readTypeDefinitions(
  esClient: ObservabilityElasticsearchClient
): Promise<OperationStatus<EntityTypeDefinition[]>> {
  try {
    const types = await esClient.esql<StoredEntityTypeDefinition>('fetch all type definitions', {
      query: `FROM ${DEFINITIONS_ALIAS} | WHERE definition_type == "type"`,
    });

    return {
      status: 'success',
      resource: types.map((storedTypeDefinition) => storedTypeDefinition.type),
    };
  } catch (error) {
    return {
      status: 'error',
      reason: `${error.name}: ${error.message}`,
    };
  }
}
