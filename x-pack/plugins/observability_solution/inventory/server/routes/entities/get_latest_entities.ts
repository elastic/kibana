/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer, ScalarValue } from '@elastic/elasticsearch/lib/api/types';
import {
  ENTITY_DISPLAY_NAME,
  ENTITY_LAST_SEEN,
  ENTITY_TYPE,
} from '@kbn/observability-shared-plugin/common';
import type { ObservabilityElasticsearchClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { unflattenObject } from '@kbn/observability-utils-common/object/unflatten_object';
import {
  ENTITIES_LATEST_ALIAS,
  InventoryEntity,
  MAX_NUMBER_OF_ENTITIES,
  type EntityColumnIds,
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
  esQuery,
  entityTypes,
}: {
  inventoryEsClient: ObservabilityElasticsearchClient;
  sortDirection: 'asc' | 'desc';
  sortField: EntityColumnIds;
  esQuery?: QueryDslQueryContainer;
  entityTypes?: string[];
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

  const latestEntitiesEsqlResponse = await inventoryEsClient.esql<
    {
      'entity.id': string;
      'entity.type': string;
      'entity.definition_id': string;
      'entity.display_name': string;
      'entity.identity_fields': string | string[];
      'entity.last_seen_timestamp': string;
      'entity.definition_version': string;
      'entity.schema_version': string;
    } & Record<string, ScalarValue | ScalarValue[]>,
    { transform: 'plain' }
  >(
    'get_latest_entities',
    {
      query,
      filter: esQuery,
      params,
    },
    { transform: 'plain' }
  );

  return latestEntitiesEsqlResponse.hits.map((latestEntity) => {
    Object.keys(latestEntity).forEach((key) => {
      const keyOfObject = key as keyof typeof latestEntity;
      // strip out multi-field aliases
      if (keyOfObject.endsWith('.text') || keyOfObject.endsWith('.keyword')) {
        delete latestEntity[keyOfObject];
      }
    });

    const { entity, ...metadata } = unflattenObject(latestEntity);

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
