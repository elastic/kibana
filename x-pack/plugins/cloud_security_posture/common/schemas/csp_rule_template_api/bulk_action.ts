/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

// this pages follows versioning interface strategy https://docs.elastic.dev/kibana-dev-docs/versioning-interfaces

const isValidRuleId = (value: string) => {
  // Define a regular expression pattern for the expected structure `${benchmark.id};${benchmark.version};${rule.number}`
  const pattern = /^[^;]+;[^;]+;[^;]+$/;
  if (!pattern.test(value)) {
    throw new Error(
      'Invalid rule_id structure. Each rule_id should follow the pattern: `${benchmark.id};${benchmark.version};${rule.number}`.'
    );
  }
};

export const cspRuleBulkActionRequest = schema.object({
  action: schema.oneOf([schema.literal('mute'), schema.literal('unmute')]),
  rule_ids: schema.arrayOf(schema.string({ validate: isValidRuleId })),
});
