/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
import { isDiffPathProtocol } from '../../../common';

export const GetSettingsRequestSchema = {};

export const PutSettingsRequestSchema = {
  body: schema.object({
    agent_auto_upgrade: schema.maybe(schema.boolean()),
    package_auto_upgrade: schema.maybe(schema.boolean()),
    kibana_urls: schema.maybe(
      schema.arrayOf(schema.uri({ scheme: ['http', 'https'] }), {
        validate: (value) => {
          if (isDiffPathProtocol(value)) {
            return 'Protocol and path must be the same for each URL';
          }
        },
      })
    ),
    kibana_ca_sha256: schema.maybe(schema.string()),
    has_seen_add_data_notice: schema.maybe(schema.boolean()),
    additional_yaml_config: schema.maybe(schema.string()),
  }),
};
