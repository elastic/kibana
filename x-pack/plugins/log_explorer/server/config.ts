/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { PluginConfigDescriptor } from '@kbn/core/server';
import { LogExplorerConfig } from '../common/plugin_config';

export const configSchema = schema.object({
  featureFlags: schema.object({
    deepLinkVisible: schema.conditional(
      schema.contextRef('serverless'),
      true,
      schema.boolean(),
      schema.never(),
      {
        defaultValue: false,
      }
    ),
  }),
});

export const config: PluginConfigDescriptor<LogExplorerConfig> = {
  schema: configSchema,
  deprecations: ({ unusedFromRoot }) => [
    unusedFromRoot('xpack.discoverLogExplorer.featureFlags.deepLinkVisible', { level: 'warning' }),
  ],
};
