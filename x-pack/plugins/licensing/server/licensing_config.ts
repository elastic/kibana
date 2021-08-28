/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '../../../../src/core/server/plugins/types';

const configSchema = schema.object({
  api_polling_frequency: schema.duration({ defaultValue: '30s' }),
});

export type LicenseConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<LicenseConfigType> = {
  schema: schema.object({
    api_polling_frequency: schema.duration({ defaultValue: '30s' }),
  }),
  deprecations: ({ renameFromRoot }) => [
    renameFromRoot(
      'xpack.xpack_main.xpack_api_polling_frequency_millis',
      'xpack.licensing.api_polling_frequency'
    ),
  ],
};
