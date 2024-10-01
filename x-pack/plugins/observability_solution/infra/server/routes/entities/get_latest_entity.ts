/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ObservabilityElasticsearchClient } from '@kbn/observability-utils/es/client/create_observability_es_client';
import { esqlResultToPlainObjects } from '@kbn/observability-utils/es/utils/esql_result_to_plain_objects';
import { ENTITY_LATEST, EntityDefinition, entitiesAliasPattern } from '@kbn/entities-schema';
import { type EntityDefinitionWithState } from '@kbn/entityManager-plugin/server/lib/entities/types';
import {
  ENTITY_TYPE,
  SOURCE_DATA_STREAM_TYPE,
} from '@kbn/observability-shared-plugin/common/field_names/elasticsearch';

const ENTITIES_LATEST_ALIAS = entitiesAliasPattern({
  type: '*',
  dataset: ENTITY_LATEST,
});

interface Entity {
  [SOURCE_DATA_STREAM_TYPE]: string | string[];
}

export async function getLatestEntity({
  inventoryEsClient,
  entityId,
  entityType,
  entityDefinitions,
}: {
  inventoryEsClient: ObservabilityElasticsearchClient;
  entityType: 'host' | 'container';
  entityId: string;
  entityDefinitions: EntityDefinition[] | EntityDefinitionWithState[];
}) {
  const hostOrContainerIdentityField = entityDefinitions[0]?.identityFields?.[0]?.field;
  if (hostOrContainerIdentityField === undefined) {
    return;
  }
  const latestEntitiesEsqlResponse = await inventoryEsClient.esql('get_latest_entities', {
    query: `FROM ${ENTITIES_LATEST_ALIAS}
        | WHERE ${ENTITY_TYPE} == "${entityType}"
        | WHERE ${hostOrContainerIdentityField} == "${entityId}"
        | KEEP ${SOURCE_DATA_STREAM_TYPE}
      `,
  });

  return esqlResultToPlainObjects<Entity>(latestEntitiesEsqlResponse)[0];
}
