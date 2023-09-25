/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';
import { developerConfigSchema, productTypes } from '../common/config';

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  developer: developerConfigSchema,
  productTypes,
});
export type ServerlessSecurityConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<ServerlessSecurityConfig> = {
  exposeToBrowser: {
    productTypes: true,
    developer: true,
  },
  schema: configSchema,
  deprecations: ({ renameFromRoot }) => [
    renameFromRoot(
      'xpack.serverless.security.productTypes',
      'xpack.securitySolutionServerless.productTypes',
      { silent: true, level: 'warning' }
    ),
  ],
};
