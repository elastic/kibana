/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { offeringBasedSchema, schema, type TypeOf } from '@kbn/config-schema';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';

const privilegeOverrideSchema = schema.maybe(
  schema.object({
    disabled: schema.maybe(schema.boolean()),
    composedOf: schema.maybe(
      schema.arrayOf(
        schema.object({
          feature: schema.string(),
          privileges: schema.arrayOf(schema.string()),
        })
      )
    ),
  })
);

export type ConfigType = TypeOf<typeof ConfigSchema>;
export type ConfigOverridesType = Required<ConfigType>['overrides'];
export const ConfigSchema = schema.object({
  overrides: offeringBasedSchema({
    // Overrides are only exposed in Serverless offering.
    serverless: schema.maybe(
      // Key is the feature ID, value is a set of feature properties to override.
      schema.recordOf(
        schema.string(),
        schema.object({
          hidden: schema.maybe(schema.boolean()),
          name: schema.maybe(schema.string({ minLength: 1 })),
          category: schema.maybe(
            schema.string({
              validate(categoryName) {
                if (!Object.hasOwn(DEFAULT_APP_CATEGORIES, categoryName)) {
                  return `Unknown category "${categoryName}". Should be one of ${Object.keys(
                    DEFAULT_APP_CATEGORIES
                  ).join(', ')}`;
                }
              },
            })
          ),
          order: schema.maybe(schema.number()),
          privileges: schema.maybe(
            schema.object({ all: privilegeOverrideSchema, read: privilegeOverrideSchema })
          ),
          subFeatures: schema.maybe(
            schema.object({
              // Key is the ID of the sub-feature privilege, value is a set of privilege properties to override.
              privileges: schema.recordOf(
                schema.string(),
                schema.object({
                  disabled: schema.maybe(schema.boolean()),
                  includeIn: schema.maybe(
                    schema.oneOf([
                      schema.literal('all'),
                      schema.literal('read'),
                      schema.literal('none'),
                    ])
                  ),
                })
              ),
            })
          ),
        })
      )
    ),
  }),
});
