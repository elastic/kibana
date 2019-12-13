/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from 'kibana/server';

export const config: PluginConfigDescriptor = {
  schema: schema.object({
    pollingFrequency: schema.duration({ defaultValue: '30s' }),
  }),
  deprecations: ({ renameFromRoot }) => [
    renameFromRoot(
      'xpack.xpack_main.xpack_api_polling_frequency_millis',
      'xpack.licensing.pollingFrequency'
    ),
  ],
};

export type LicenseConfigType = TypeOf<typeof config.schema>;
