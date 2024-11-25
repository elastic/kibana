/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient, Logger } from '@kbn/core/server';
import { DEFINITIONS_ALIAS, TEMPLATE_VERSION } from '../constants';
import {
  EntityTypeDefinition,
  CreateOperationStatus,
  ReadOperationStatus,
  StoredEntityTypeDefinition,
} from '../types';
import { runESQLQuery } from '../run_esql_query';

export async function storeTypeDefinition(
  type: EntityTypeDefinition,
  clusterClient: IScopedClusterClient,
  logger: Logger
): Promise<CreateOperationStatus<EntityTypeDefinition>> {
  try {
    const esClient = clusterClient.asInternalUser;

    const types = await runESQLQuery('fetch type definition for conflict check', {
      esClient,
      query: `FROM ${DEFINITIONS_ALIAS} METADATA _id | WHERE definition_type == "type" AND _id == "type:${type.id}"`,
      logger,
    });

    if (types.length !== 0) {
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

    await esClient.index({
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
  clusterClient: IScopedClusterClient,
  logger: Logger
): Promise<ReadOperationStatus<EntityTypeDefinition[]>> {
  try {
    const esClient = clusterClient.asInternalUser;

    const types = await runESQLQuery<StoredEntityTypeDefinition>('fetch all type definitions', {
      esClient,
      query: `FROM ${DEFINITIONS_ALIAS} | WHERE definition_type == "type"`,
      logger,
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
