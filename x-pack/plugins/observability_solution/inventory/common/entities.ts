/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import { ENTITY_LATEST, entitiesAliasPattern, entityLatestSchema } from '@kbn/entities-schema';
import {
  ENTITY_DEFINITION_ID,
  ENTITY_DISPLAY_NAME,
  ENTITY_ID,
  ENTITY_IDENTITY_FIELDS,
  ENTITY_LAST_SEEN,
  ENTITY_TYPE,
} from '@kbn/observability-shared-plugin/common';
import { decode, encode } from '@kbn/rison';
import { isRight } from 'fp-ts/lib/Either';
import * as t from 'io-ts';

export const entityColumnIdsRt = t.union([
  t.literal(ENTITY_DISPLAY_NAME),
  t.literal(ENTITY_LAST_SEEN),
  t.literal(ENTITY_TYPE),
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

const entityArrayRt = t.array(t.string);
export const entityTypesRt = new t.Type<string[], string, unknown>(
  'entityTypesRt',
  entityArrayRt.is,
  (input, context) => {
    if (typeof input === 'string') {
      const arr = input.split(',');
      const validation = entityArrayRt.decode(arr);
      if (isRight(validation)) {
        return t.success(validation.right);
      }
    } else if (Array.isArray(input)) {
      const validation = entityArrayRt.decode(input);
      if (isRight(validation)) {
        return t.success(validation.right);
      }
    }

    return t.failure(input, context);
  },
  (arr) => arr.join()
);

export interface Entity {
  [ENTITY_LAST_SEEN]: string;
  [ENTITY_ID]: string;
  [ENTITY_TYPE]: string;
  [ENTITY_DISPLAY_NAME]: string;
  [ENTITY_DEFINITION_ID]: string;
  [ENTITY_IDENTITY_FIELDS]: string | string[];
  alertsCount?: number;
  [key: string]: any;
}

export type EntityGroup = {
  count: number;
} & {
  [key: string]: any;
};

export type InventoryEntityLatest = z.infer<typeof entityLatestSchema> & {
  alertsCount?: number;
};
