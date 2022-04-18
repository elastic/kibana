/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor } from '@kbn/core/server';
import { ConfigSchema, ConfigType } from './schema';

/**
 * Helper function
 */
export const durationToNumber = (value: number | moment.Duration): number => {
  if (typeof value === 'number') {
    return value;
  }
  return value.asMilliseconds();
};

/**
 * Screenshotting plugin configuration schema.
 */
export const config: PluginConfigDescriptor<ConfigType> = {
  schema: ConfigSchema,
  deprecations: ({ renameFromRoot }) => [
    renameFromRoot('xpack.reporting.capture.networkPolicy', 'xpack.screenshotting.networkPolicy', {
      level: 'warning',
    }),
    renameFromRoot(
      'xpack.reporting.capture.browser.autoDownload',
      'xpack.screenshotting.browser.autoDownload',
      { level: 'warning' }
    ),
    renameFromRoot(
      'xpack.reporting.capture.browser.chromium.inspect',
      'xpack.screenshotting.browser.chromium.inspect',
      { level: 'warning' }
    ),
    renameFromRoot(
      'xpack.reporting.capture.browser.chromium.disableSandbox',
      'xpack.screenshotting.browser.chromium.disableSandbox',
      { level: 'warning' }
    ),
    renameFromRoot(
      'xpack.reporting.capture.browser.chromium.proxy.enabled',
      'xpack.screenshotting.browser.chromium.proxy.enabled',
      { level: 'warning' }
    ),
    renameFromRoot(
      'xpack.reporting.capture.browser.chromium.proxy.server',
      'xpack.screenshotting.browser.chromium.proxy.server',
      { level: 'warning' }
    ),
    renameFromRoot(
      'xpack.reporting.capture.browser.chromium.proxy.bypass',
      'xpack.screenshotting.browser.chromium.proxy.bypass',
      { level: 'warning' }
    ),
    renameFromRoot(
      'xpack.reporting.capture.timeouts.openUrl',
      'xpack.screenshotting.capture.timeouts.openUrl',
      { level: 'warning' }
    ),
    renameFromRoot(
      'xpack.reporting.capture.timeouts.renderComplete',
      'xpack.screenshotting.capture.timeouts.renderComplete',
      { level: 'warning' }
    ),
    renameFromRoot(
      'xpack.reporting.capture.timeouts.waitForElements',
      'xpack.screenshotting.capture.timeouts.waitForElements',
      { level: 'warning' }
    ),
    renameFromRoot('xpack.reporting.capture.zoom', 'xpack.screenshotting.capture.zoom', {
      level: 'warning',
    }),
    renameFromRoot('xpack.reporting.capture.loadDelay', 'xpack.screenshotting.capture.loadDelay', {
      level: 'warning',
    }),
  ],
  exposeToUsage: {
    networkPolicy: false, // show as [redacted]
    capture: {
      timeouts: { openUrl: true, renderComplete: true, waitForElements: true },
      loadDelay: true,
      zoom: true,
    },
  },
};

export { createConfig } from './create_config';
export type { ConfigType } from './schema';
