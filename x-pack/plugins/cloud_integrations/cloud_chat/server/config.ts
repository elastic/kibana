/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, has } from 'lodash';
import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from '@kbn/core/server';

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  chatURL: schema.maybe(schema.string()),
  chatIdentitySecret: schema.maybe(schema.string()),
});

export type CloudChatConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<CloudChatConfigType> = {
  exposeToBrowser: {
    chatURL: true,
  },
  schema: configSchema,
  deprecations: () => [
    // Silently move the chat configuration from `xpack.cloud` to `xpack.cloud_integrations.chat`.
    // No need to emit a deprecation log because it's an internal restructure
    (cfg) => {
      return {
        set: [
          ...copyIfExists({
            cfg,
            fromKey: 'xpack.cloud.chat.enabled',
            toKey: 'xpack.cloud_integrations.chat.enabled',
          }),
          ...copyIfExists({
            cfg,
            fromKey: 'xpack.cloud.chat.chatURL',
            toKey: 'xpack.cloud_integrations.chat.chatURL',
          }),
          ...copyIfExists({
            cfg,
            fromKey: 'xpack.cloud.chatIdentitySecret',
            toKey: 'xpack.cloud_integrations.chat.chatIdentitySecret',
          }),
        ],
        unset: [
          { path: 'xpack.cloud.chat.enabled' },
          { path: 'xpack.cloud.chat.chatURL' },
          { path: 'xpack.cloud.chatIdentitySecret' },
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
