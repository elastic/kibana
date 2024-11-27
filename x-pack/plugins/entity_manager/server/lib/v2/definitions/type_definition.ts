/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient, Logger } from '@kbn/core/server';
import { DEFINITIONS_ALIAS, TEMPLATE_VERSION } from '../constants';
import { EntityTypeDefinition, StoredEntityTypeDefinition } from '../types';
import { SourceAs, runESQLQuery } from '../run_esql_query';
import { EntityDefinitionConflict } from '../errors/entity_definition_conflict';

export async function storeTypeDefinition(
  type: EntityTypeDefinition,
  clusterClient: IScopedClusterClient,
  logger: Logger
): Promise<EntityTypeDefinition> {
  const esClient = clusterClient.asInternalUser;

  const types = await runESQLQuery('fetch type definition for conflict check', {
    esClient,
    query: `FROM ${DEFINITIONS_ALIAS} METADATA _id | WHERE definition_type == "type" AND _id == "type:${type.id}" | KEEP _id`,
    logger,
  });

  if (types.length !== 0) {
    throw new EntityDefinitionConflict('type', type.id);
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

  return definition.type;
}

export async function readTypeDefinitions(
  clusterClient: IScopedClusterClient,
  logger: Logger
): Promise<EntityTypeDefinition[]> {
  const esClient = clusterClient.asInternalUser;

  const types = await runESQLQuery<SourceAs<StoredEntityTypeDefinition>>(
    'fetch all type definitions',
    {
      esClient,
      query: `FROM ${DEFINITIONS_ALIAS} METADATA _source | WHERE definition_type == "type" | KEEP _source`,
      logger,
    }
  );

  return types.map((storedTypeDefinition) => storedTypeDefinition._source.type);
}
