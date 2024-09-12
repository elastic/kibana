/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Required } from 'utility-types';
import type { Entity, EntityTypeDefinition } from '../../../common/entities';
import { InventoryAPIClient } from '../../api';

export function getDataStreamsForEntity({
  entity,
  typeDefinition,
  inventoryAPIClient,
  signal,
}: {
  entity: Entity;
  typeDefinition: Required<EntityTypeDefinition, 'discoveryDefinition'>;
  inventoryAPIClient: InventoryAPIClient;
  signal: AbortSignal;
}) {
  return inventoryAPIClient.fetch('POST /internal/inventory/entities/data_streams_for_entity', {
    signal,
    params: {
      body: {
        indexPatterns: typeDefinition.discoveryDefinition.indexPatterns,
        kql: typeDefinition.discoveryDefinition.identityFields
          .map(({ field }) => {
            const value = entity.properties[field];
            if (value === null || value === undefined || value === '') {
              return `(NOT ${field}:*)`;
            }

            return [field, typeof value === 'string' ? `"${value}"` : value].join(':');
          })
          .join(' AND '),
      },
    },
  });
}
