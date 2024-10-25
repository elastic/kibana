/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_LATEST, entitiesAliasPattern } from '@kbn/entities-schema';
import { type EntityClient } from '@kbn/entityManager-plugin/server/lib/entity_client';
import {
  ENTITY_TYPE,
  SOURCE_DATA_STREAM_TYPE,
} from '@kbn/observability-shared-plugin/common/field_names/elasticsearch';
import type { ObservabilityElasticsearchClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { esqlResultToPlainObjects } from '@kbn/observability-utils-server/es/esql_result_to_plain_objects';

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
  entityManagerClient,
}: {
  inventoryEsClient: ObservabilityElasticsearchClient;
  entityType: 'host' | 'container';
  entityId: string;
  entityManagerClient: EntityClient;
}): Promise<Entity | undefined> {
  const { definitions } = await entityManagerClient.getEntityDefinitions({
    builtIn: true,
    type: entityType,
  });

  const hostOrContainerIdentityField = definitions[0]?.identityFields?.[0]?.field;
  if (hostOrContainerIdentityField === undefined) {
    return { [SOURCE_DATA_STREAM_TYPE]: [] };
  }

  const latestEntitiesEsqlResponse = await inventoryEsClient.esql('get_latest_entities', {
    query: `FROM ${ENTITIES_LATEST_ALIAS}
        | WHERE ${ENTITY_TYPE} == ?
        | WHERE ${hostOrContainerIdentityField} == ?
        | KEEP ${SOURCE_DATA_STREAM_TYPE}
      `,
    params: [entityType, entityId],
  });

  return esqlResultToPlainObjects<Entity>(latestEntitiesEsqlResponse)[0];
}
