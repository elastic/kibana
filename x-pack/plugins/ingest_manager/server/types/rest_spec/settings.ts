/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';

export const GetSettingsRequestSchema = {};

export const PutSettingsRequestSchema = {
  body: schema.object({
    agent_auto_upgrade: schema.maybe(schema.boolean()),
    package_auto_upgrade: schema.maybe(schema.boolean()),
    kibana_url: schema.maybe(schema.uri({ scheme: ['http', 'https'] })),
    kibana_ca_sha256: schema.maybe(schema.string()),
  }),
};
