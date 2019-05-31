/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTelemetryOptIn } from '../../../telemetry/server';

export async function replaceInjectedVars(originalInjectedVars, request, server) {
  const xpackInfo = server.plugins.xpack_main.info;

  const withXpackInfo = async () => ({
    ...originalInjectedVars,
    telemetryOptedIn: await getTelemetryOptIn(request),
    xpackInitialInfo: xpackInfo.isAvailable() ? xpackInfo.toJSON() : undefined,
  });

  // security feature is disabled
  if (!server.plugins.security) {
    return await withXpackInfo();
  }

  // not enough license info to make decision one way or another
  if (!xpackInfo.isAvailable() || !xpackInfo.feature('security').getLicenseCheckResults()) {
    return originalInjectedVars;
  }

  // request is not authenticated
  if (!await server.plugins.security.isAuthenticated(request)) {
    return originalInjectedVars;
  }

  // plugin enabled, license is appropriate, request is authenticated
  return await withXpackInfo();
}
