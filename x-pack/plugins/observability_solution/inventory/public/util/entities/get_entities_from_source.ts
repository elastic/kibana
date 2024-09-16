/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { set } from '@kbn/safer-lodash-set';
import { castArray } from 'lodash';
import { InventoryAPIClient } from '../../api';
import { EntityDefinition } from '../../../common/entities';

export async function getEntitiesFromSource({
  inventoryAPIClient,
  dslFilter,
  indexPatterns,
  definition,
  signal,
  start,
  end,
}: {
  dslFilter: QueryDslQueryContainer[];
  indexPatterns: string[];
  inventoryAPIClient: InventoryAPIClient;
  definition: EntityDefinition;
  signal: AbortSignal;
  start: number;
  end: number;
}): Promise<Array<Record<string, string | null | undefined>>> {
  const requiredFields =
    definition.identityFields.filter(({ optional }) => !optional).map(({ field }) => field) ?? [];

  const baseQuery = `FROM ${indexPatterns.join(', ')} METADATA _index`;

  const columnsOnlyQuery = baseQuery + ' | LIMIT 0';

  const withRequiredFieldsFilter = [
    ...dslFilter,
    ...(requiredFields.length
      ? [
          {
            bool: {
              filter: requiredFields.map((field) => ({ exists: { field } })),
            },
          },
        ]
      : []),
  ];

  const availableColumnNames = await inventoryAPIClient
    .fetch('POST /internal/inventory/esql', {
      signal,
      params: {
        body: {
          query: columnsOnlyQuery,
          kuery: '',
          start,
          end,
          dslFilter: withRequiredFieldsFilter,
          operationName: 'get_entities_from_source',
        },
      },
    })
    .then((response) => {
      return new Set([...(response.all_columns?.map((column) => column.name) ?? [])]);
    });

  const hasAllRequiredIdentityFields = definition.identityFields.every(
    ({ field, optional }) => optional || availableColumnNames.has(field)
  );

  if (!hasAllRequiredIdentityFields) {
    return [];
  }

  const groupingFields = definition.identityFields
    .filter(({ field }) => availableColumnNames.has(field))
    .map(({ field }) => field);

  const entitiesQuery =
    baseQuery + ` | STATS _index = VALUES(_index) BY ${groupingFields.join(',')}`;

  const result = await inventoryAPIClient.fetch('POST /internal/inventory/esql', {
    signal,
    params: {
      body: {
        query: entitiesQuery,
        kuery: '',
        start,
        end,
        dslFilter: withRequiredFieldsFilter,
        operationName: 'get_entities_from_source',
      },
    },
  });

  return result.values.map((values) => {
    return values.reduce<Record<string, any>>((acc, value, index) => {
      const column = result.columns[index];
      if (column.name === '_index') {
        value = castArray(value)[0];
      }
      set(acc, column.name, value);
      return acc;
    }, {});
  });
}
