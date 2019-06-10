/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleOldSettings } from './handle_old_settings';

/**
 * Determine if the banner should be displayed.
 *
 * This method can have side-effects related to deprecated config settings.
 *
 * @param {Object} config The advanced settings config object.
 * @param {Object} _handleOldSettings handleOldSettings function, but overridable for tests.
 * @return {Boolean} {@code true} if the banner should be displayed. {@code false} otherwise.
 */
export async function shouldShowBanner(telemetryOptInProvider, config, { _handleOldSettings = handleOldSettings } = {}) {
  return telemetryOptInProvider.getOptIn() === null && await _handleOldSettings(config, telemetryOptInProvider);
}
