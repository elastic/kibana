/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ENTITY_LATEST, entitiesAliasPattern, type EntityMetadata } from '@kbn/entities-schema';
import { decode, encode } from '@kbn/rison';
import { isRight } from 'fp-ts/lib/Either';
import * as t from 'io-ts';

export const entityColumnIdsRt = t.union([
  t.literal('entityDisplayName'),
  t.literal('entityLastSeenTimestamp'),
  t.literal('entityType'),
  t.literal('alertsCount'),
  t.literal('actions'),
]);

export type EntityColumnIds = t.TypeOf<typeof entityColumnIdsRt>;

export const entityViewRt = t.union([t.literal('unified'), t.literal('grouped')]);

const paginationRt = t.record(t.string, t.number);
export const entityPaginationRt = new t.Type<Record<string, number> | undefined, string, unknown>(
  'entityPaginationRt',
  paginationRt.is,
  (input, context) => {
    switch (typeof input) {
      case 'string': {
        try {
          const decoded = decode(input);
          const validation = paginationRt.decode(decoded);
          if (isRight(validation)) {
            return t.success(validation.right);
          }

          return t.failure(input, context);
        } catch (e) {
          return t.failure(input, context);
        }
      }

      case 'undefined':
        return t.success(input);

      default: {
        const validation = paginationRt.decode(input);

        if (isRight(validation)) {
          return t.success(validation.right);
        }

        return t.failure(input, context);
      }
    }
  },
  (o) => encode(o)
);

export type EntityView = t.TypeOf<typeof entityViewRt>;

export type EntityPagination = t.TypeOf<typeof entityPaginationRt>;

export const defaultEntitySortField: EntityColumnIds = 'alertsCount';

export const MAX_NUMBER_OF_ENTITIES = 500;

export const ENTITIES_LATEST_ALIAS = entitiesAliasPattern({
  type: '*',
  dataset: ENTITY_LATEST,
});

export type EntityGroup = {
  count: number;
} & {
  [key: string]: string;
};

export type InventoryEntity = {
  entityId: string;
  entityType: string;
  entityIdentityFields: string | string[];
  entityDisplayName: string;
  entityDefinitionId: string;
  entityLastSeenTimestamp: string;
  entityDefinitionVersion: string;
  entitySchemaVersion: string;
  alertsCount?: number;
} & EntityMetadata;
