/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaPluginServiceFactory } from '@kbn/presentation-util-plugin/public';

import { CanvasStartDeps } from '../../plugin';
import { CanvasReportingService } from '../reporting';

export type CanvasReportingServiceFactory = KibanaPluginServiceFactory<
  CanvasReportingService,
  CanvasStartDeps
>;

export const reportingServiceFactory: CanvasReportingServiceFactory = ({
  startPlugins,
  coreStart,
}) => {
  const { reporting } = startPlugins;

  const reportingEnabled = () => ({
    getReportingPanelPDFComponent: () => reporting?.components.ReportingPanelPDFV2 || null,
  });
  const reportingDisabled = () => ({ getReportingPanelPDFComponent: () => null });

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
