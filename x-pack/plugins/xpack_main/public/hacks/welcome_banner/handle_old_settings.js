/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CONFIG_TELEMETRY } from '../../../common/constants';

/**
 * Clean up any old, deprecated settings and determine if we should continue.
 *
 * This <em>will</em> update the latest telemetry setting if necessary.
 *
 * @param {Object} config The advanced settings config object.
 * @return {Boolean} {@code true} if the banner should still be displayed. {@code false} if the banner should not be displayed.
 */
export async function handleOldSettings(config, telemetryOptInProvider) {
  const CONFIG_ALLOW_REPORT = 'xPackMonitoring:allowReport';
  const CONFIG_SHOW_BANNER = 'xPackMonitoring:showBanner';
  const oldAllowReportSetting = config.get(CONFIG_ALLOW_REPORT, null);
  const oldTelemetrySetting = config.get(CONFIG_TELEMETRY, null);

  let legacyOptInValue = null;

  if (typeof oldTelemetrySetting === 'boolean') {
    legacyOptInValue = oldTelemetrySetting;
  } else if (typeof oldAllowReportSetting === 'boolean') {
    legacyOptInValue = oldAllowReportSetting;
  }

  if (legacyOptInValue !== null) {
    try {
      await telemetryOptInProvider.setOptIn(legacyOptInValue);

      // delete old keys once we've successfully changed the setting (if it fails, we just wait until next time)
      config.remove(CONFIG_ALLOW_REPORT);
      config.remove(CONFIG_SHOW_BANNER);
      config.remove(CONFIG_TELEMETRY);
    } finally {
      return false;
    }
  }

  const oldShowSetting = config.get(CONFIG_SHOW_BANNER, null);

  if (oldShowSetting !== null) {
    config.remove(CONFIG_SHOW_BANNER);
  }

  return true;
}
