/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { FilterStateStore } from '../../../../../../src/plugins/data/common';

// alert type parameters

export interface RefreshInterval {
  pause: boolean;
  value: number;
}

export type SavedQueryTimeFilter = TypeOf<typeof SavedQueryTimeFilterSchema>;
export const SavedQueryTimeFilterSchema = schema.object(
  {
    from: schema.string(),
    to: schema.string(),
    mode: schema.maybe(schema.oneOf([schema.literal('absolute'), schema.literal('relative')])),
  },
  { unknowns: 'allow' }
);

export type Query = TypeOf<typeof QuerySchema>;
export const QuerySchema = schema.object({
  query: schema.oneOf([schema.string(), schema.recordOf(schema.string(), schema.any())]),
  language: schema.string(),
});

export type FilterMeta = TypeOf<typeof FilterMetaSchema>;
export const FilterMetaSchema = schema.object(
  {
    alias: schema.nullable(schema.string()),
    disabled: schema.boolean(),
    negate: schema.boolean(),
    controlledBy: schema.maybe(schema.string()),
    index: schema.maybe(schema.string()),
    type: schema.maybe(schema.string()),
    key: schema.maybe(schema.string()),
    params: schema.maybe(schema.any()),
    value: schema.maybe(schema.string()),
  },
  { unknowns: 'allow' }
);

export type Params = TypeOf<typeof ParamsSchema>;
export const ParamsSchema = schema.object(
  {
    query: QuerySchema,
    filters: schema.maybe(
      schema.arrayOf(
        schema.object(
          {
            meta: FilterMetaSchema,
            query: schema.maybe(schema.any()),
            $state: schema.maybe(
              schema.object({
                store: schema.oneOf([
                  schema.literal(FilterStateStore.APP_STATE),
                  schema.literal(FilterStateStore.GLOBAL_STATE),
                ]),
              })
            ),
          },
          { unknowns: 'allow' }
        )
      )
    ),
    timefilter: schema.maybe(SavedQueryTimeFilterSchema),
  },
  { unknowns: 'allow' }
);
