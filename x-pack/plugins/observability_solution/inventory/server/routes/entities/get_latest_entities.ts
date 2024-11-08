/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObservabilityElasticsearchClient } from '@kbn/observability-utils/es/client/create_observability_es_client';
import { kqlQuery } from '@kbn/observability-utils/es/queries/kql_query';
import {
  ENTITY_LAST_SEEN,
  ENTITY_TYPE,
  ENTITY_DISPLAY_NAME,
} from '@kbn/observability-shared-plugin/common';
import type { ScalarValue } from '@elastic/elasticsearch/lib/api/types';
import type { EntityInstance } from '@kbn/entities-schema';
import {
  ENTITIES_LATEST_ALIAS,
  MAX_NUMBER_OF_ENTITIES,
  type EntityColumnIds,
  InventoryEntity,
} from '../../../common/entities';
import { getBuiltinEntityDefinitionIdESQLWhereClause } from './query_helper';

type EntitySortableColumnIds = Extract<
  EntityColumnIds,
  'entityLastSeenTimestamp' | 'entityDisplayName' | 'entityType'
>;
const SORT_FIELDS_TO_ES_FIELDS: Record<EntitySortableColumnIds, string> = {
  entityLastSeenTimestamp: ENTITY_LAST_SEEN,
  entityDisplayName: ENTITY_DISPLAY_NAME,
  entityType: ENTITY_TYPE,
} as const;

export async function getLatestEntities({
  inventoryEsClient,
  sortDirection,
  sortField,
  entityTypes,
  kuery,
}: {
  inventoryEsClient: ObservabilityElasticsearchClient;
  sortDirection: 'asc' | 'desc';
  sortField: EntityColumnIds;
  entityTypes?: string[];
  kuery?: string;
}): Promise<InventoryEntity[]> {
  // alertsCount doesn't exist in entities index. Ignore it and sort by entity.lastSeenTimestamp by default.
  const entitiesSortField =
    SORT_FIELDS_TO_ES_FIELDS[sortField as EntitySortableColumnIds] ?? ENTITY_LAST_SEEN;

  const from = `FROM ${ENTITIES_LATEST_ALIAS}`;
  const where: string[] = [getBuiltinEntityDefinitionIdESQLWhereClause()];
  const params: ScalarValue[] = [];

  if (entityTypes) {
    where.push(`WHERE ${ENTITY_TYPE} IN (${entityTypes.map(() => '?').join()})`);
    params.push(...entityTypes);
  }

  const sort = `SORT ${entitiesSortField} ${sortDirection}`;
  const limit = `LIMIT ${MAX_NUMBER_OF_ENTITIES}`;

  const query = [from, ...where, sort, limit].join(' | ');

  const latestEntitiesEsqlResponse = await inventoryEsClient.esql<EntityInstance>(
    'get_latest_entities',
    {
      query,
      filter: {
        bool: {
          filter: [...kqlQuery(kuery)],
        },
      },
      params,
    }
  );

  return latestEntitiesEsqlResponse.map((lastestEntity) => {
    const { entity, ...metadata } = lastestEntity;

    return {
      entityId: entity.id,
      entityType: entity.type,
      entityDefinitionId: entity.definition_id,
      entityDisplayName: entity.display_name,
      entityIdentityFields: entity.identity_fields,
      entityLastSeenTimestamp: entity.last_seen_timestamp,
      entityDefinitionVersion: entity.definition_version,
      entitySchemaVersion: entity.schema_version,
      ...metadata,
    };
  });
}
