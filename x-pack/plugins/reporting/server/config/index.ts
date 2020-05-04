/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginConfigDescriptor } from 'kibana/server';
import { ConfigSchema, ConfigType } from './schema';

export { createConfig$ } from './create_config';

export const config: PluginConfigDescriptor<ConfigType> = {
  exposeToBrowser: { poll: true },
  schema: ConfigSchema,
  deprecations: ({ unused }) => [
    unused('capture.browser.chromium.maxScreenshotDimension'),
    unused('capture.concurrency'),
    unused('capture.settleTime'),
    unused('capture.timeout'),
    unused('kibanaApp'),
  ],
};

export { ConfigSchema, ConfigType };
