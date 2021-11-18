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
export type { ReportingConfigType };
export { ConfigSchema };

export const config: PluginConfigDescriptor<ReportingConfigType> = {
  exposeToBrowser: { poll: true, roles: true },
  schema: ConfigSchema,
  deprecations: ({ unused }) => [
    unused('capture.browser.chromium.maxScreenshotDimension', { level: 'warning' }), // unused since 7.8
    unused('poll.jobCompletionNotifier.intervalErrorMultiplier', { level: 'warning' }), // unused since 7.10
    unused('poll.jobsRefresh.intervalErrorMultiplier', { level: 'warning' }), // unused since 7.10
    unused('capture.viewport', { level: 'warning' }), // deprecated as unused since 7.16
    (settings, fromPath, addDeprecation) => {
      const reporting = get(settings, fromPath);
      if (reporting?.roles?.enabled !== false) {
        addDeprecation({
          configPath: `${fromPath}.roles.enabled`,
          level: 'warning',
          title: i18n.translate('xpack.reporting.deprecations.reportingRoles.title', {
            defaultMessage: 'Setting "{fromPath}.roles" is deprecated',
            values: { fromPath },
          }),
          // TODO: once scheduled reports is released, restate this to say that we have no access to scheduled reporting.
          // https://github.com/elastic/kibana/issues/79905
          message: i18n.translate('xpack.reporting.deprecations.reportingRoles.description', {
            defaultMessage:
              `Use Kibana application privileges to grant reporting privileges.` +
              ` Using  "{fromPath}.roles.allow" to grant reporting privileges` +
              ` is deprecated.` +
              ` The "{fromPath}.roles.enabled" setting will default to false` +
              ` in a future release.`,
            values: { fromPath },
          }),
          correctiveActions: {
            manualSteps: [
              i18n.translate('xpack.reporting.deprecations.reportingRoles.manualStepOne', {
                defaultMessage: `Set "xpack.reporting.roles.enabled" to "false" in kibana.yml.`,
              }),
              i18n.translate('xpack.reporting.deprecations.reportingRoles.manualStepOnePartOne', {
                defaultMessage: `Remove "xpack.reporting.roles.allow" to "false" in kibana.yml, if present.`,
              }),
              i18n.translate('xpack.reporting.deprecations.reportingRoles.manualStepTwo', {
                defaultMessage:
                  `Create one or more roles that grant the Kibana application` +
                  ` privilege for reporting from **Management > Security > Roles**.`,
              }),
              i18n.translate('xpack.reporting.deprecations.reportingRoles.manualStepThree', {
                defaultMessage:
                  `Grant reporting privileges to users by assigning one of the new roles.` +
                  ` Users assigned a reporting role specified in "xpack.reporting.roles.allow"` +
                  ` will no longer have reporting privileges, they must be assigned an application privilege based role.`,
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
