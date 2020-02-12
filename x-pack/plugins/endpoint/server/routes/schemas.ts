/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';

export const alertListReqSchema = schema.object(
  {
    page_size: schema.maybe(schema.number()),
    page_index: schema.maybe(schema.number()),
    after: schema.maybe(
      schema.arrayOf(schema.any(), {
        minSize: 2,
        maxSize: 2,
      })
    ),
    before: schema.maybe(
      schema.arrayOf(schema.any(), {
        minSize: 2,
        maxSize: 2,
      })
    ),
    sort: schema.string({ defaultValue: '@timestamp' }),
    order: schema.string({
      defaultValue: 'desc',
      validate(value) {
        if (value !== 'asc' && value !== 'desc') {
          return 'must be `asc` or `desc`';
        }
      },
    }),
    filters: schema.string({ defaultValue: '' }),
    query: schema.string({ defaultValue: '' }),
  },
  {
    validate(value) {
      if (value.after !== undefined && value.page_index !== undefined) {
        return '[page_index] cannot be used with [after]';
      }
      if (value.before !== undefined && value.page_index !== undefined) {
        return '[page_index] cannot be used with [before]';
      }
      if (value.before !== undefined && value.after !== undefined) {
        return '[before] cannot be used with [after]';
      }
    },
  }
);
