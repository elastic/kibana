/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity } from '../entities';

export function toEntity(result: Record<string, any>): Entity {
  return {
    id: result['entity.id'],
    type: result['entity.type'],
    displayName: result['entity.displayName'],
    properties: result,
  };
}
