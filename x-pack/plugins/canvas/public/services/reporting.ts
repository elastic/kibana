/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CanvasServiceFactory } from './';

export interface ReportingService {
  includeReporting: () => boolean;
}

export const reportingServiceFactory: CanvasServiceFactory<ReportingService> = (
  _coreSetup,
  coreStart,
  _setupPlugins,
  startPlugins
): ReportingService => {
  const { reporting } = startPlugins;
  if (!reporting) {
    // Reporting is not enabled
    return { includeReporting: () => false };
  }

  if (reporting.usesUiCapabilities()) {
    // Canvas has declared Reporting as a subfeature with the `generatePdf` UI Capability
    return {
      includeReporting: () => coreStart.application.capabilities.canvas?.generatePdf === true,
    };
  }

  // Reporting is enabled as an Elasticsearch feature (Legacy/Deprecated)
  return { includeReporting: () => true };
};
