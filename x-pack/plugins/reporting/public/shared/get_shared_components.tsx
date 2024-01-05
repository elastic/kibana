/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from '@kbn/core/public';
import { CSV_JOB_TYPE } from '@kbn/reporting-export-types-csv-common';
import React from 'react';
import { ReportingAPIClient } from '../lib/reporting_api_client';
import { CsvModalContent } from '../share_context_menu/csv_export_modal';
import { ReportingPanelProps } from '../share_context_menu/reporting_panel_content';
import { ReportingModalContent } from '../share_context_menu/reporting_panel_content_lazy';
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

export interface ReportingPublicComponents {
  /**
   * An element to display a form to export the page as PDF
   */
  ReportingModalPDFV2(props: ApplicationProps): JSX.Element;

  /**
   * An element to display a form to export the page as PNG
   */
  ReportingModalPNGV2(props: ApplicationProps): JSX.Element;

  /**
   * An element to display a form to export the page as CSV
   */
  ReportingModalCSV(props: ApplicationProps): JSX.Element;
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
    ReportingModalPDFV2(props: ApplicationProps) {
      return (
        <ReportingModalContent
          requiresSavedState={false}
          apiClient={apiClient}
          toasts={core.notifications.toasts}
          uiSettings={core.uiSettings}
          theme={core.theme}
          {...props}
        />
      );
    },
    ReportingModalPNGV2(props: ApplicationProps) {
      return (
        <ReportingModalContent
          requiresSavedState={false}
          apiClient={apiClient}
          toasts={core.notifications.toasts}
          uiSettings={core.uiSettings}
          theme={core.theme}
          {...props}
        />
      );
    },
    ReportingModalCSV(props: ApplicationProps) {
      return (
        <CsvModalContent
          requiresSavedState={false}
          apiClient={apiClient}
          toasts={core.notifications.toasts}
          uiSettings={core.uiSettings}
          reportType={CSV_JOB_TYPE}
          theme={core.theme}
          {...props}
        />
      );
    },
  };
}
