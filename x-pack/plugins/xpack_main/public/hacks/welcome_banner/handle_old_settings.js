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
export async function handleOldSettings(config) {
  const CONFIG_ALLOW_REPORT = 'xPackMonitoring:allowReport';
  const CONFIG_SHOW_BANNER = 'xPackMonitoring:showBanner';
  const oldSetting = config.get(CONFIG_ALLOW_REPORT, null);

  if (oldSetting !== null) {
    if (await config.set(CONFIG_TELEMETRY, Boolean(oldSetting))) {
      // delete old keys once we've successfully changed the setting (if it fails, we just wait until next time)
      config.remove(CONFIG_ALLOW_REPORT);
      config.remove(CONFIG_SHOW_BANNER);
    }

    return false;
  }

  const oldShowSetting = config.get(CONFIG_SHOW_BANNER, null);

  if (oldShowSetting !== null) {
    config.remove(CONFIG_SHOW_BANNER);
  }

  return true;
}