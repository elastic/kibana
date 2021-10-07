/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
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
    unused('capture.browser.chromium.maxScreenshotDimension'), // unused since 7.8
    unused('poll.jobCompletionNotifier.intervalErrorMultiplier'), // unused since 7.10
    unused('poll.jobsRefresh.intervalErrorMultiplier'), // unused since 7.10
    (settings, fromPath, addDeprecation) => {
      const reporting = get(settings, fromPath);
      if (reporting?.index) {
        addDeprecation({
          title: i18n.translate('xpack.reporting.deprecations.reportingIndex.title', {
            defaultMessage: 'Setting "{fromPath}.index" is deprecated',
            values: { fromPath },
          }),
          message: i18n.translate('xpack.reporting.deprecations.reportingIndex.description', {
            defaultMessage: `Multitenancy by changing "kibana.index" will not be supported starting in 8.0. See https://ela.st/kbn-remove-legacy-multitenancy for more details`,
          }),
          correctiveActions: {
            manualSteps: [
              i18n.translate('xpack.reporting.deprecations.reportingIndex.manualStepOne', {
                defaultMessage: `If you rely on this setting to achieve multitenancy you should use Spaces, cross-cluster replication, or cross-cluster search instead.`,
              }),
              i18n.translate('xpack.reporting.deprecations.reportingIndex.manualStepTwo', {
                defaultMessage: `To migrate to Spaces, we encourage using saved object management to export your saved objects from a tenant into the default tenant in a space.`,
              }),
            ],
          },
        });
      }

      if (reporting?.roles?.enabled !== false) {
        addDeprecation({
          title: i18n.translate('xpack.reporting.deprecations.reportingRoles.title', {
            defaultMessage: 'Setting "{fromPath}.roles" is deprecated',
            values: { fromPath },
          }),
          message: i18n.translate('xpack.reporting.deprecations.reportingRoles.description', {
            defaultMessage:
              `Granting reporting privilege through a "reporting_user" role will not be supported` +
              ` starting in 8.0. Please set "xpack.reporting.roles.enabled" to "false" and grant reporting privileges to users` +
              ` using Kibana application privileges **Management > Security > Roles**.`,
          }),
          correctiveActions: {
            manualSteps: [
              i18n.translate('xpack.reporting.deprecations.reportingRoles.manualStepOne', {
                defaultMessage: `Set 'xpack.reporting.roles.enabled' to 'false' in your kibana configs.`,
              }),
              i18n.translate('xpack.reporting.deprecations.reportingRoles.manualStepTwo', {
                defaultMessage:
                  `Grant reporting privileges to users using Kibana application privileges` +
                  ` under **Management > Security > Roles**.`,
              }),
            ],
          },
        });
      }
    },
  ],
  exposeToUsage: {
    capture: {
      maxAttempts: true,
      timeouts: { openUrl: true, renderComplete: true, waitForElements: true },
      networkPolicy: false, // show as [redacted]
      zoom: true,
    },
    csv: { maxSizeBytes: true, scroll: { size: true, duration: true } },
    kibanaServer: false, // show as [redacted]
    queue: { indexInterval: true, pollEnabled: true, timeout: true },
    roles: { enabled: true },
  },
};
