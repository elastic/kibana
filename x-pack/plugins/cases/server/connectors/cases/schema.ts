/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

const AlertSchema = schema.recordOf(schema.string(), schema.string(), {
  validate: (value) => {
    if (!Object.hasOwn(value, 'id') || !Object.hasOwn(value, 'index')) {
      return 'Alert ID and index must be defined';
    }
  },
});

/**
 * At the moment only one field is supported for grouping
 */
const GroupingSchema = schema.arrayOf(schema.string(), { minSize: 0, maxSize: 1 });

const RuleSchema = schema.object({
  id: schema.string(),
  name: schema.string(),
  /**
   * TODO: Verify limits
   */
  tags: schema.arrayOf(schema.string({ minLength: 1, maxLength: 50 }), { minSize: 0, maxSize: 10 }),
});

/**
 * The case connector does not have any configuration
 * or secrets.
 */
export const CasesConnectorConfigSchema = schema.object({});
export const CasesConnectorSecretsSchema = schema.object({});

export const CasesConnectorParamsSchema = schema.object({
  alerts: schema.arrayOf(AlertSchema),
  groupingBy: GroupingSchema,
  owner: schema.string(),
  rule: RuleSchema,
});
