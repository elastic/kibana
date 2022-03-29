/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const transformHealthRuleParams = schema.object({
  includeTransforms: schema.arrayOf(schema.string()),
  excludeTransforms: schema.nullable(schema.arrayOf(schema.string(), { defaultValue: [] })),
  testsConfig: schema.nullable(
    schema.object({
      notStarted: schema.nullable(
        schema.object({
          enabled: schema.boolean({ defaultValue: true }),
        })
      ),
      errorMessaged: schema.nullable(
        schema.object({
          enabled: schema.boolean({ defaultValue: true }),
        })
      ),
    })
  ),
});

export type TransformHealthRuleParams = TypeOf<typeof transformHealthRuleParams>;
