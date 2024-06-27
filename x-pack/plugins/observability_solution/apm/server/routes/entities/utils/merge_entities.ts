/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact, uniq } from 'lodash';
import { MergedServiceEntities, ServiceEntities } from '../types';

export function mergeEntities({
  entities,
}: {
  entities: ServiceEntities[];
}): MergedServiceEntities[] {
  const mergedEntities = entities.reduce((map, current) => {
    const key = current.serviceName;
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

function mergeFunc(entity: ServiceEntities, existingEntity?: MergedServiceEntities) {
  if (!existingEntity) {
    return {
      serviceName: entity.serviceName,
      agentName: entity.agentName,
      signalTypes: entity.signalTypes,
      environments: compact([entity.entity.identityFields.service?.environment]),
      latestTimestamp: entity.entity.latestTimestamp,
      metrics: [entity.entity.metrics],
    };
  }
  return {
    serviceName: entity.serviceName,
    agentName: entity.agentName,
    signalTypes: uniq(compact([...(existingEntity?.signalTypes ?? []), ...entity.signalTypes])),
    environments: uniq(
      compact([...existingEntity?.environments, entity.entity.identityFields?.service?.environment])
    ),
    latestTimestamp: entity.entity.latestTimestamp,
    metrics: [...existingEntity?.metrics, entity.entity.metrics],
  };
}
