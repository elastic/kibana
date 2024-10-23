/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unflattenObject } from '@kbn/observability-utils/object/unflatten_object';
import type { Entity, InventoryEntityLatest } from '../entities';

export function unflattenEntity(entity: Entity) {
  return unflattenObject(entity) as InventoryEntityLatest;
}
