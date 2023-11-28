/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

// this pages follows versioning interface strategy https://docs.elastic.dev/kibana-dev-docs/versioning-interfaces

export const cspRuleBulkActionRequest = schema.object({
  /**
   *  action
   */
  action: schema.oneOf([schema.literal('mute'), schema.literal('unmute')]),
  /**
   *  Fields to retrieve from CspRuleTemplate saved object
   */
  rule_ids: schema.arrayOf(schema.string()),
});
