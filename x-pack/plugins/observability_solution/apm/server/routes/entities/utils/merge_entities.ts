/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact, uniq } from 'lodash';
import { EntityDataStreamType } from '@kbn/observability-shared-plugin/common';
import type { EntityLatestServiceRaw } from '../types';
import type { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';

export interface MergedServiceEntity {
  serviceName: string;
  agentName: AgentName;
  dataStreamTypes: EntityDataStreamType[];
  environments: string[];
}

export function mergeEntities({
  entities,
}: {
  entities: EntityLatestServiceRaw[];
}): MergedServiceEntity[] {
  const mergedEntities = entities.reduce((map, current) => {
    const key = current.service.name;
    if (map.has(key)) {
      const existingEntity = map.get(key);
      map.set(key, mergeFunc(current, existingEntity));
    } else {
      map.set(key, mergeFunc(current));
    }
    return map;
  }, new Map());

  return [...mergedEntities.values()];
}

function mergeFunc(entity: EntityLatestServiceRaw, existingEntity?: MergedServiceEntity) {
  const commonEntityFields = {
    serviceName: entity.service.name,
    agentName: entity.agent.name[0],
    lastSeenTimestamp: entity.entity.last_seen_timestamp,
  };

  if (!existingEntity) {
    return {
      ...commonEntityFields,
      dataStreamTypes: entity.source_data_stream.type,
      environments: compact([entity?.service.environment]),
    };
  }
  return {
    ...commonEntityFields,
    dataStreamTypes: uniq(
      compact([...(existingEntity?.dataStreamTypes ?? []), ...entity.source_data_stream.type])
    ),
    environments: uniq(compact([...existingEntity?.environments, entity?.service.environment])),
  };
}
