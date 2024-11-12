/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Entity } from '@kbn/entities-schema';
import { uniq } from 'lodash';

function mergeEntities(entity1: Entity, entity2: Entity): Entity {
  const merged: Entity = {
    ...entity1,
    'entity.last_seen_timestamp': new Date(
      Math.max(
        Date.parse(entity1['entity.last_seen_timestamp']),
        Date.parse(entity2['entity.last_seen_timestamp'])
      )
    ).toISOString(),
  };

  for (const [key, value] of Object.entries(entity2).filter(([_key]) =>
    _key.startsWith('metadata.')
  )) {
    if (merged[key]) {
      merged[key] = uniq(
        Array.isArray(merged[key]) ? [...merged[key], value] : [merged[key], value]
      );
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

export function mergeEntitiesList(entities: Entity[]): Entity[] {
  const instances: { [key: string]: Entity } = {};

  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    const id = entity['entity.id'];

    if (instances[id]) {
      instances[id] = mergeEntities(instances[id], entity);
    } else {
      instances[id] = entity;
    }
  }

  return Object.values(instances);
}
