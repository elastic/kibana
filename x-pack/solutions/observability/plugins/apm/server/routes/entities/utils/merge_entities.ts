/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray, compact, uniq } from 'lodash';
import type { EntityDataStreamType } from '@kbn/observability-shared-plugin/common';
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
    const key = current['service.name'];
    if (map.has(key)) {
      const existingEntity = map.get(key);
      map.set(key, mergeFunc(current, existingEntity));
    } else {
      map.set(key, mergeFunc(current));
    }
    return map;
  }, new Map());

  return [...new Set(mergedEntities.values())];
}

function mergeFunc(entity: EntityLatestServiceRaw, existingEntity?: MergedServiceEntity) {
  const commonEntityFields = {
    serviceName: entity['service.name'],
    agentName:
      Array.isArray(entity['agent.name']) && entity['agent.name'].length > 0
        ? entity['agent.name'][0]
        : entity['agent.name'],
    lastSeenTimestamp: entity['entity.last_seen_timestamp'],
  };

  if (!existingEntity) {
    return {
      ...commonEntityFields,
      dataStreamTypes: uniq(castArray(entity['data_stream.type'])),
      environments: uniq(
        compact(
          Array.isArray(entity['service.environment'])
            ? entity['service.environment']
            : [entity['service.environment']]
        )
      ),
    };
  }
  return {
    ...commonEntityFields,
    dataStreamTypes: uniq(
      compact([
        ...(existingEntity?.dataStreamTypes ?? []),
        ...castArray(entity['data_stream.type']),
      ])
    ),
    environments: uniq(compact([...existingEntity?.environments, entity['service.environment']])),
  };
}
