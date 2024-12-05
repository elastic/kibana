/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient, Logger } from '@kbn/core/server';
import { DEFINITIONS_ALIAS, TEMPLATE_VERSION } from '../constants';
import { EntitySourceDefinition, StoredEntitySourceDefinition } from '../types';
import { SourceAs, runESQLQuery } from '../run_esql_query';
import { EntityDefinitionConflict } from '../errors/entity_definition_conflict';

export async function storeSourceDefinition(
  source: EntitySourceDefinition,
  clusterClient: IScopedClusterClient,
  logger: Logger
): Promise<EntitySourceDefinition> {
  const esClient = clusterClient.asInternalUser;

  const sources = await runESQLQuery('fetch source definition for conflict check', {
    esClient,
    query: `FROM ${DEFINITIONS_ALIAS} METADATA _id | WHERE definition_type == "source" AND _id == "source:${source.id}" | KEEP _id`,
    logger,
  });

  if (sources.length !== 0) {
    throw new EntityDefinitionConflict('source', source.id);
  }

  const definition: StoredEntitySourceDefinition = {
    template_version: TEMPLATE_VERSION,
    definition_type: 'source',
    source,
  };

  await esClient.index({
    index: DEFINITIONS_ALIAS,
    id: `source:${definition.source.id}`,
    document: definition,
  });

  return definition.source;
}

export interface ReadSourceDefinitionOptions {
  type?: string;
}

export async function readSourceDefinitions(
  clusterClient: IScopedClusterClient,
  logger: Logger,
  options?: ReadSourceDefinitionOptions
): Promise<EntitySourceDefinition[]> {
  const esClient = clusterClient.asInternalUser;

  const typeFilter = options?.type ? `AND source.type_id == "${options.type}"` : '';
  const sources = await runESQLQuery<SourceAs<StoredEntitySourceDefinition>>(
    'fetch all source definitions',
    {
      esClient,
      query: `FROM ${DEFINITIONS_ALIAS} METADATA _source | WHERE definition_type == "source" ${typeFilter} | KEEP _source`,
      logger,
    }
  );

  return sources.map((storedTypeDefinition) => storedTypeDefinition._source.source);
}
