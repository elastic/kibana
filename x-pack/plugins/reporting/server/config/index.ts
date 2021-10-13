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
          level: 'warning',
          title: i18n.translate('xpack.reporting.deprecations.reportingRoles.title', {
            defaultMessage: 'Setting "{fromPath}.roles" is deprecated',
            values: { fromPath },
          }),
          // TODO: once scheduled reports is released, restate this to say that we have no access to scheduled reporting.
          // https://github.com/elastic/kibana/issues/79905
          message: i18n.translate('xpack.reporting.deprecations.reportingRoles.description', {
            defaultMessage:
              `Using roles defined by "{fromPath}.roles.allow" to grant reporting ` +
              `privileges prevents users from using API Keys to create reports, and ` +
              `prevents admins from using Kibana application privileges to grant reporting privileges.`,
            values: { fromPath },
          }),
          correctiveActions: {
            manualSteps: [
              i18n.translate('xpack.reporting.deprecations.reportingRoles.manualStepOne', {
                defaultMessage: `Set "xpack.reporting.roles.enabled" to "false" in kibana.yml.`,
              }),
              i18n.translate('xpack.reporting.deprecations.reportingRoles.manualStepTwo', {
                defaultMessage:
                  `Create one or more roles that grant the Kibana application ` +
                  `privilege for reporting from **Management > Security > Roles**.`,
              }),
              i18n.translate('xpack.reporting.deprecations.reportingRoles.manualStepThree', {
                defaultMessage:
                  `Grant reporting privileges to users by assigning one of the new roles. ` +
                  `Users assigned a reporting role specified in "xpack.reporting.roles.allow" ` +
                  `will no longer have reporting privileges, they must be assigned an application privilege based role.`,
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
