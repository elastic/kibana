/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { encode, decode } from 'rison-node';
import { schema } from '@kbn/config-schema';
import { esKuery } from '../../../../../../../src/plugins/data/server';

export const alertListReqSchema = schema.object(
  {
    page_size: schema.maybe(
      schema.number({
        min: 1,
        max: 100,
      })
    ),
    page_index: schema.maybe(
      schema.number({
        min: 0,
        // TODO: should we define a max to force cursor-based pagination after a certain point?
      })
    ),
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
    sort: schema.maybe(
      schema.string({
        validate(value) {
          // TODO: check for valid key in `AlertData`
        },
      })
    ),
    order: schema.maybe(
      schema.string({
        validate(value) {
          if (value !== 'asc' && value !== 'desc') {
            return 'must be `asc` or `desc`';
          }
        },
      })
    ),
    query: schema.maybe(
      schema.string({
        validate(value) {
          try {
            esKuery.fromKueryExpression(value);
          } catch (err) {
            return 'must be valid KQL';
          }
        },
      })
    ),

    // rison-encoded string
    filters: schema.maybe(
      schema.string({
        validate(value) {
          try {
            decode(value);
          } catch (err) {
            return 'must be a valid rison-encoded string';
          }
        },
      })
    ),

    // rison-encoded string
    date_range: schema.string({
      // TODO: make this configurable... how to handle encoded default?
      // defaultValue: config.alertResultListDefaultDateRange,
      defaultValue: encode({ from: 'now-2y', to: 'now' }),
      validate(value) {
        try {
          decode(value);
        } catch (err) {
          return 'must be a valid rison-encoded string';
        }
      },
    }),
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
