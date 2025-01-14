/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';

import { PluginConfigDescriptor } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { ConfigSchema, ReportingConfigType } from '@kbn/reporting-server';

export const config: PluginConfigDescriptor<ReportingConfigType> = {
  exposeToBrowser: {
    csv: {
      enablePanelActionDownload: true,
      scroll: true,
    },
    poll: true,
    roles: true,
    export_types: true,
    statefulSettings: true,
  },
  schema: ConfigSchema,
  deprecations: ({ unused }) => [
    unused('queue.indexInterval', { level: 'warning' }), // unused since 8.15
    unused('capture.browser.chromium.maxScreenshotDimension', { level: 'warning' }), // unused since 7.8
    unused('capture.browser.type', { level: 'warning' }),
    unused('poll.jobCompletionNotifier.intervalErrorMultiplier', { level: 'warning' }), // unused since 7.10
    unused('poll.jobsRefresh.intervalErrorMultiplier', { level: 'warning' }), // unused since 7.10
    unused('capture.viewport', { level: 'warning' }), // deprecated as unused since 7.16
    (settings, fromPath, addDeprecation) => {
      const reporting = get(settings, fromPath);

      if (reporting?.csv?.enablePanelActionDownload === true) {
        addDeprecation({
          configPath: `${fromPath}.csv.enablePanelActionDownload`,
          title: i18n.translate('xpack.reporting.deprecations.csvPanelActionDownload.title', {
            defaultMessage:
              'The setting to enable CSV Download from saved search panels in dashboards is deprecated.',
          }),
          level: 'warning',
          message: i18n.translate('xpack.reporting.deprecations.csvPanelActionDownload.message', {
            defaultMessage: `The "{enablePanelActionDownload}" setting is deprecated.`,
            values: {
              enablePanelActionDownload: `${fromPath}.csv.enablePanelActionDownload`,
            },
          }),
          correctiveActions: {
            manualSteps: [
              i18n.translate('xpack.reporting.deprecations.csvPanelActionDownload.manualStep1', {
                defaultMessage:
                  'Remove "{enablePanelActionDownload}" from `kibana.yml` or change the setting to `false`.',
                values: {
                  enablePanelActionDownload: `${fromPath}.csv.enablePanelActionDownload`,
                },
              }),
              i18n.translate('xpack.reporting.deprecations.csvPanelActionDownload.manualStep2', {
                defaultMessage:
                  'Use the replacement panel action to generate CSV reports from saved search panels in the Dashboard application.',
              }),
            ],
          },
        });
      }
    },
  ],
  exposeToUsage: {
    capture: { maxAttempts: true },
    csv: {
      enablePanelActionDownload: true,
      maxSizeBytes: true,
      scroll: { size: true, duration: true },
    },
    kibanaServer: false, // show as [redacted]
    queue: { indexInterval: true, pollEnabled: true, timeout: true },
    roles: { enabled: true },
  },
};

export { createConfig } from './create_config';
export { registerUiSettings } from './ui_settings';
export { ConfigSchema };
