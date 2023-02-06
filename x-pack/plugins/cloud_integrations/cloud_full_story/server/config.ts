/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from '@kbn/core/server';
import { get, has } from 'lodash';

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  org_id: schema.conditional(
    schema.siblingRef('enabled'),
    true,
    schema.string({ minLength: 1 }),
    schema.maybe(schema.string())
  ),
  eventTypesAllowlist: schema.arrayOf(schema.string(), {
    defaultValue: [
      'Loaded Kibana', // Sent once per page refresh (potentially, once per session)
      'Hosts View Query Submitted', // Worst-case scenario 1 every 2 seconds
      'Host Entry Clicked', // Worst-case scenario once per second - AT RISK,
    ],
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
          ...copyIfExists({
            cfg,
            fromKey: 'xpack.cloud.full_story.enabled',
            toKey: 'xpack.cloud_integrations.full_story.enabled',
          }),
          ...copyIfExists({
            cfg,
            fromKey: 'xpack.cloud.full_story.org_id',
            toKey: 'xpack.cloud_integrations.full_story.org_id',
          }),
          ...copyIfExists({
            cfg,
            fromKey: 'xpack.cloud.full_story.eventTypesAllowlist',
            toKey: 'xpack.cloud_integrations.full_story.eventTypesAllowlist',
          }),
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

/**
 * Defines the `set` action only if the key exists in the `fromKey` value.
 * This is to avoid overwriting actual values with undefined.
 * @param cfg The config object
 * @param fromKey The key to copy from.
 * @param toKey The key where the value should be copied to.
 */
function copyIfExists({
  cfg,
  fromKey,
  toKey,
}: {
  cfg: Readonly<{ [p: string]: unknown }>;
  fromKey: string;
  toKey: string;
}) {
  return has(cfg, fromKey) ? [{ path: toKey, value: get(cfg, fromKey) }] : [];
}
