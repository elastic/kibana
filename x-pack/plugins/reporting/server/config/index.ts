/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginConfigDescriptor } from 'kibana/server';
import { get } from 'lodash';
import { ConfigSchema, ReportingConfigType } from './schema';
export { buildConfig } from './config';
export { registerUiSettings } from './ui_settings';
export { ConfigSchema, ReportingConfigType };

export const config: PluginConfigDescriptor<ReportingConfigType> = {
  exposeToBrowser: { poll: true, roles: true },
  schema: ConfigSchema,
  deprecations: ({ unused }) => [
    unused('capture.browser.chromium.maxScreenshotDimension'),
    unused('capture.concurrency'),
    unused('capture.settleTime'),
    unused('capture.timeout'),
    unused('poll.jobCompletionNotifier.intervalErrorMultiplier'),
    unused('poll.jobsRefresh.intervalErrorMultiplier'),
    unused('kibanaApp'),
    (settings, fromPath, addDeprecation) => {
      const reporting = get(settings, fromPath);
      if (reporting?.index) {
        addDeprecation({
          message: `"${fromPath}.index" is deprecated. Multitenancy by changing "kibana.index" will not be supported starting in 8.0. See https://ela.st/kbn-remove-legacy-multitenancy for more details`,
          correctiveActions: {
            manualSteps: [
              `If you rely on this setting to achieve multitenancy you should use Spaces, cross-cluster replication, or cross-cluster search instead.`,
              `To migrate to Spaces, we encourage using saved object management to export your saved objects from a tenant into the default tenant in a space.`,
            ],
          },
        });
      }

      if (reporting?.roles?.enabled !== false) {
        addDeprecation({
          message:
            `"${fromPath}.roles" is deprecated. Granting reporting privilege through a "reporting_user" role will not be supported ` +
            `starting in 8.0. Please set "xpack.reporting.roles.enabled" to "false" and grant reporting privileges to users ` +
            `using Kibana application privileges **Management > Security > Roles**.`,
          correctiveActions: {
            manualSteps: [
              `Set 'xpack.reporting.roles.enabled' to 'false' in your kibana configs.`,
              `Grant reporting privileges to users using Kibana application privileges` +
                `under **Management > Security > Roles**.`,
            ],
          },
        });
      }
    },
  ],
};
