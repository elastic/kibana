/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
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
          {
            path: 'xpack.cloud_integrations.chat.enabled',
            value: get(cfg, 'xpack.cloud.chat.enabled'),
          },
          {
            path: 'xpack.cloud_integrations.chat.chatURL',
            value: get(cfg, 'xpack.cloud.chat.chatURL'),
          },
          {
            path: 'xpack.cloud_integrations.chat.chatIdentitySecret',
            value: get(cfg, 'xpack.cloud.chatIdentitySecret'),
          },
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
