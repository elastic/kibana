/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity, EntityDataSource, IdentityField } from '../../../common/entities';
import { InventoryAPIClient } from '../../api';

export function getDataStreamsForEntity<TEntity extends Entity>({
  entity,
  identityFields,
  sources,
  inventoryAPIClient,
  signal,
  start,
  end,
}: {
  entity: TEntity;
  identityFields: IdentityField[];
  sources: EntityDataSource[];
  inventoryAPIClient: InventoryAPIClient;
  signal: AbortSignal;
  start: number;
  end: number;
}) {
  return inventoryAPIClient.fetch(
    'POST /internal/inventory/data_streams/find_datastreams_for_filter',
    {
      signal,
      params: {
        body: {
          start,
          end,
          indexPatterns: sources.flatMap((source) => source.indexPatterns),
          kql: identityFields
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
    }
  );
}
