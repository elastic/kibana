/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { PluginConfigDescriptor } from '@kbn/core/server';

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
});

export const config: PluginConfigDescriptor = {
  schema: configSchema,
  deprecations: ({ unusedFromRoot }) => [
    // Deprecate the old chat configuration keys
    unusedFromRoot('xpack.cloud.chat.enabled', { silent: true, level: 'warning' }),
    unusedFromRoot('xpack.cloud.chat.chatURL', { silent: true, level: 'warning' }),
    unusedFromRoot('xpack.cloud.chatIdentitySecret', { silent: true, level: 'warning' }),

    // Deprecate the latest chat configuration keys
    unusedFromRoot('xpack.cloud_integrations.chat.enabled', { silent: true, level: 'warning' }),
    unusedFromRoot('xpack.cloud_integrations.chat.chatURL', { silent: true, level: 'warning' }),
    unusedFromRoot('xpack.cloud_integrations.chat.chatIdentitySecret', {
      silent: true,
      level: 'warning',
    }),
    unusedFromRoot('xpack.cloud_integrations.chat.trialBuffer', {
      silent: true,
      level: 'warning',
    }),
  ],
};
