/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, offeringBasedSchema } from '@kbn/config-schema';
import { PluginConfigDescriptor } from '@kbn/core/server';
import { ObservabilityLogExplorerConfig } from '../common/plugin_config';

export const configSchema = schema.object({
  navigation: schema.object({
    showAppLink: offeringBasedSchema({
      serverless: schema.boolean({
        defaultValue: true,
      }),
      options: {
        defaultValue: false,
      },
    }),
  }),
});

export const config: PluginConfigDescriptor<ObservabilityLogExplorerConfig> = {
  schema: configSchema,
  deprecations: ({ renameFromRoot }) => [
    renameFromRoot(
      'xpack.discoverLogExplorer.featureFlags.deepLinkVisible',
      'xpack.observabilityLogExplorer.navigation.showAppLink',
      { level: 'warning' }
    ),
  ],
  exposeToBrowser: {
    navigation: {
      showAppLink: true,
    },
  },
};
