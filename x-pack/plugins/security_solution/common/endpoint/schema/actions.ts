/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const HostIsolationRequestSchema = {
  body: schema.object({
    agent_ids: schema.nullable(schema.arrayOf(schema.string())),
    endpoint_ids: schema.nullable(schema.arrayOf(schema.string())),
    alert_ids: schema.nullable(schema.arrayOf(schema.string())),
    case_ids: schema.nullable(schema.arrayOf(schema.string())),
    comment: schema.nullable(schema.string()),
  }),
};
