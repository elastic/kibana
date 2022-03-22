/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TelemetryPluginStart } from '../../../../../../src/plugins/telemetry/public';

export type { TelemetryPluginStart } from '../../../../../../src/plugins/telemetry/public';
export { shouldShowTelemetryOptIn };

/**
 * Indicates whether we should show the telemetry opt in checkbox + popover tooltip
 * @param {TelemetryPluginStart|undefined} telemetry The telemetry plugin start API
 * @returns {boolean} true iif the opt in should be shown
 */
function shouldShowTelemetryOptIn(
  telemetry?: TelemetryPluginStart
): telemetry is TelemetryPluginStart {
  if (telemetry) {
    const { telemetryService } = telemetry;
    const isOptedIn = telemetryService.getIsOptedIn();
    const canChangeOptInStatus = telemetryService.getCanChangeOptInStatus();
    return canChangeOptInStatus && !isOptedIn;
  }

  return false;
}
