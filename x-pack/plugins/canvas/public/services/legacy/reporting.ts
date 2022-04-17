/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReportingStart } from '@kbn/reporting-plugin/public';
import { CanvasServiceFactory } from '.';

export interface ReportingService {
  start?: ReportingStart;
}

export const reportingServiceFactory: CanvasServiceFactory<ReportingService> = (
  _coreSetup,
  coreStart,
  _setupPlugins,
  startPlugins
): ReportingService => {
  const { reporting } = startPlugins;

  const reportingEnabled = () => ({ start: reporting });
  const reportingDisabled = () => ({ start: undefined });

  if (!reporting) {
    // Reporting is not enabled
    return reportingDisabled();
  }

  if (reporting.usesUiCapabilities()) {
    if (coreStart.application.capabilities.canvas?.generatePdf === true) {
      // Canvas has declared Reporting as a subfeature with the `generatePdf` UI Capability
      return reportingEnabled();
    } else {
      return reportingDisabled();
    }
  }

  // Legacy/Deprecated: Reporting is enabled as an Elasticsearch feature
  return reportingEnabled();
};
