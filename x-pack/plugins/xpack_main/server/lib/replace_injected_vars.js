/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTelemetryOptIn } from './get_telemetry_opt_in';
import { populateUICapabilities } from './populate_ui_capabilities';

export async function replaceInjectedVars(originalInjectedVars, request, server) {
  const xpackInfo = server.plugins.xpack_main.info;

  const originalInjectedVarsWithUICapabilities = {
    ...originalInjectedVars,
    uiCapabilities: {
      ...populateUICapabilities(server.plugins.xpack_main, originalInjectedVars.uiCapabilities),
    }
  };

  const withXpackInfo = async () => ({
    ...originalInjectedVarsWithUICapabilities,
    telemetryOptedIn: await getTelemetryOptIn(request),
    xpackInitialInfo: xpackInfo.isAvailable() ? xpackInfo.toJSON() : undefined,
  });

  // security feature is disabled
  if (!server.plugins.security) {
    return await withXpackInfo();
  }

  // not enough license info to make decision one way or another
  if (!xpackInfo.isAvailable() || !xpackInfo.feature('security').getLicenseCheckResults()) {
    return originalInjectedVarsWithUICapabilities;
  }

  // request is not authenticated
  if (!await server.plugins.security.isAuthenticated(request)) {
    return originalInjectedVarsWithUICapabilities;
  }

  // plugin enabled, license is appropriate, request is authenticated
  return await withXpackInfo();
}
