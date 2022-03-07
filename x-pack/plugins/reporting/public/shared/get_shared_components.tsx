/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from 'kibana/public';
import React from 'react';
import { PDF_REPORT_TYPE, PDF_REPORT_TYPE_V2, PNG_REPORT_TYPE_V2 } from '../../common/constants';
import { ReportingAPIClient } from '../lib/reporting_api_client';
import { ReportingPanelProps } from '../share_context_menu/reporting_panel_content';
import { ScreenCapturePanelContent } from '../share_context_menu/screen_capture_panel_content_lazy';

/**
 * Properties for displaying a share menu with Reporting features.
 */
export interface ApplicationProps {
  /**
   * A function that Reporting calls to get the sharing data from the application.
   */
  getJobParams: ReportingPanelProps['getJobParams'];

  /**
   * Option to control how the screenshot(s) is/are placed in the PDF
   */
  layoutOption?: 'canvas' | 'print';

  /**
   * Saved object ID
   */
  objectId?: string;

  /**
   * A function to callback when the Reporting panel should be closed
   */
  onClose: () => void;
}

/**
 * React components used to display share menus with Reporting features in an application.
 */
export interface ReportingPublicComponents {
  /**
   * An element to display a form to export the page as PDF
   * @deprecated
   */
  ReportingPanelPDF(props: ApplicationProps): JSX.Element;

  /**
   * An element to display a form to export the page as PDF
   */
  ReportingPanelPDFV2(props: ApplicationProps): JSX.Element;

  /**
   * An element to display a form to export the page as PNG
   */
  ReportingPanelPNGV2(props: ApplicationProps): JSX.Element;
}

/**
 * As of 7.14, the only shared component is a PDF report that is suited for Canvas integration.
 * This is not planned to expand, as work is to be done on moving the export-type implementations out of Reporting
 * Related Discuss issue: https://github.com/elastic/kibana/issues/101422
 */
export function getSharedComponents(
  core: CoreSetup,
  apiClient: ReportingAPIClient
): ReportingPublicComponents {
  return {
    ReportingPanelPDF(props: ApplicationProps) {
      return (
        <ScreenCapturePanelContent
          requiresSavedState={false}
          reportType={PDF_REPORT_TYPE}
          apiClient={apiClient}
          toasts={core.notifications.toasts}
          uiSettings={core.uiSettings}
          theme={core.theme}
          {...props}
        />
      );
    },
    ReportingPanelPDFV2(props: ApplicationProps) {
      return (
        <ScreenCapturePanelContent
          requiresSavedState={false}
          reportType={PDF_REPORT_TYPE_V2}
          apiClient={apiClient}
          toasts={core.notifications.toasts}
          uiSettings={core.uiSettings}
          theme={core.theme}
          {...props}
        />
      );
    },
    ReportingPanelPNGV2(props: ApplicationProps) {
      return (
        <ScreenCapturePanelContent
          requiresSavedState={false}
          reportType={PNG_REPORT_TYPE_V2}
          apiClient={apiClient}
          toasts={core.notifications.toasts}
          uiSettings={core.uiSettings}
          theme={core.theme}
          {...props}
        />
      );
    },
  };
}
