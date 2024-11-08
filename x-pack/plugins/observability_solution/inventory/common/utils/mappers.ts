/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityInstance } from '@kbn/entities-schema';
import { InventoryEntity } from '../entities';

export function toEntityLatest(inventoryEntityLatest: InventoryEntity): EntityInstance {
  const {
    entityDefinitionId,
    entityDisplayName,
    entityId,
    entityIdentityFields,
    entityLastSeenTimestamp,
    entityType,
    entityDefinitionVersion,
    entitySchemaVersion,
    alertsCount: _,
    ...metadata
  } = inventoryEntityLatest;

  return {
    entity: {
      id: entityId,
      type: entityType,
      definition_id: entityDefinitionId,
      display_name: entityDisplayName,
      identity_fields: entityIdentityFields,
      last_seen_timestamp: entityLastSeenTimestamp,
      definition_version: entityDefinitionVersion,
      schema_version: entitySchemaVersion,
    },
    ...metadata,
  };
}
