/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { TelemetryPluginStart } from '../../../../../../src/plugins/telemetry/public';

export type { TelemetryPluginStart } from '../../../../../../src/plugins/telemetry/public';
export { shouldShowTelemetryOptIn };

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
