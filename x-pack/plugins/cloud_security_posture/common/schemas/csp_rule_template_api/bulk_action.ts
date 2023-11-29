/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

// this pages follows versioning interface strategy https://docs.elastic.dev/kibana-dev-docs/versioning-interfaces

export const cspRuleBulkActionRequest = schema.object({
  action: schema.oneOf([schema.literal('mute'), schema.literal('unmute')]),
  rules: schema.arrayOf(
    schema.object({
      benchmark_id: schema.string(),
      benchmark_version: schema.string(),
      rule_number: schema.string(),
    })
  ),
});
