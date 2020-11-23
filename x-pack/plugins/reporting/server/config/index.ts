/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { PluginConfigDescriptor } from 'kibana/server';
import { ConfigSchema, ReportingConfigType } from './schema';
export { buildConfig } from './config';
export { ConfigSchema, ReportingConfigType };

export const config: PluginConfigDescriptor<ReportingConfigType> = {
  exposeToBrowser: { poll: true },
  schema: ConfigSchema,
  deprecations: ({ unused }) => [
    unused('capture.browser.chromium.maxScreenshotDimension'),
    unused('capture.concurrency'),
    unused('capture.settleTime'),
    unused('capture.timeout'),
    unused('poll.jobCompletionNotifier.intervalErrorMultiplier'),
    unused('poll.jobsRefresh.intervalErrorMultiplier'),
    unused('kibanaApp'),
    (settings, fromPath, log) => {
      const reporting = get(settings, fromPath);
      if (reporting?.index) {
        log(
          `"xpack.reporting.index" is deprecated. Multitenancy by changing "kibana.index" will not be supported starting in 8.0. See https://ela.st/kbn-remove-legacy-multitenancy for more details`
        );
      }
      return settings;
    },
  ],
};
