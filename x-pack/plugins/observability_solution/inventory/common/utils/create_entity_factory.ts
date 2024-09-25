/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity } from '../entities';
import { getEntityId } from './get_entity_id';

interface EntityFactory<T> {
  get: (options: {
    type: string;
    displayName: string;
  }) => Pick<Entity, 'type' | 'displayName'> & { id: string } & T;
  values: () => Array<Pick<Entity, 'type' | 'displayName'> & { id: string } & T>;
}

export function createEntityFactory<T>(create: () => T): EntityFactory<T> {
  const map = new Map<string, Pick<Entity, 'type' | 'displayName'> & { id: string } & T>();

  return {
    get: ({ type, displayName }) => {
      const id = getEntityId({ type, displayName });
      const existing = map.get(id);
      if (!existing) {
        const next = {
          type,
          displayName,
          id,
          ...create(),
        };

        map.set(id, next);
        return next;
      }
      return existing;
    },
    values: () => Array.from(map.values()),
  };
}
