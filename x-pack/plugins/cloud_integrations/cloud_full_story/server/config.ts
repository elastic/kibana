/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from '@kbn/core/server';
import { get } from 'lodash';

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  org_id: schema.conditional(
    schema.siblingRef('enabled'),
    true,
    schema.string({ minLength: 1 }),
    schema.maybe(schema.string())
  ),
  eventTypesAllowlist: schema.arrayOf(schema.string(), {
    defaultValue: ['Loaded Kibana'],
  }),
});

export type CloudFullStoryConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<CloudFullStoryConfigType> = {
  exposeToBrowser: {
    org_id: true,
    eventTypesAllowlist: true,
  },
  schema: configSchema,
  deprecations: () => [
    // Silently move the chat configuration from `xpack.cloud` to `xpack.cloud_integrations.full_story`.
    // No need to emit a deprecation log because it's an internal restructure
    (cfg) => {
      return {
        set: [
          {
            path: 'xpack.cloud_integrations.full_story.enabled',
            value: get(cfg, 'xpack.cloud.full_story.enabled'),
          },
          {
            path: 'xpack.cloud_integrations.full_story.org_id',
            value: get(cfg, 'xpack.cloud.full_story.org_id'),
          },
          {
            path: 'xpack.cloud_integrations.full_story.eventTypesAllowlist',
            value: get(cfg, 'xpack.cloud.full_story.eventTypesAllowlist'),
          },
        ],
        unset: [
          { path: 'xpack.cloud.full_story.enabled' },
          { path: 'xpack.cloud.full_story.org_id' },
          { path: 'xpack.cloud.full_story.eventTypesAllowlist' },
        ],
      };
    },
  ],
};
