/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from 'kibana/server';

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
