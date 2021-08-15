/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from 'kibana/public';
import React from 'react';
import { ReportingAPIClient } from '../';
import { PDF_REPORT_TYPE, PDF_REPORT_TYPE_V2, PNG_REPORT_TYPE_V2 } from '../../common/constants';
import type { Props as PanelPropsScreenCapture } from '../share_context_menu/screen_capture_panel_content';
import { ScreenCapturePanelContent } from '../share_context_menu/screen_capture_panel_content_lazy';

interface IncludeOnCloseFn {
  onClose: () => void;
}

type Props = Pick<PanelPropsScreenCapture, 'getJobParams' | 'layoutOption'> & IncludeOnCloseFn;

/*
 * As of 7.14, the only shared component is a PDF report that is suited for Canvas integration.
 * This is not planned to expand, as work is to be done on moving the export-type implementations out of Reporting
 * Related Discuss issue: https://github.com/elastic/kibana/issues/101422
 */
export function getSharedComponents(core: CoreSetup, apiClient: ReportingAPIClient) {
  return {
    ReportingPanelPDF(props: Props) {
      return (
        <ScreenCapturePanelContent
          layoutOption={props.layoutOption}
          requiresSavedState={false}
          reportType={PDF_REPORT_TYPE}
          apiClient={apiClient}
          toasts={core.notifications.toasts}
          uiSettings={core.uiSettings}
          {...props}
        />
      );
    },
    ReportingPanelPDFV2(props: Props) {
      return (
        <ScreenCapturePanelContent
          layoutOption={props.layoutOption}
          requiresSavedState={false}
          reportType={PDF_REPORT_TYPE_V2}
          apiClient={apiClient}
          toasts={core.notifications.toasts}
          uiSettings={core.uiSettings}
          {...props}
        />
      );
    },
    ReportingPanelPNGV2(props: Props) {
      return (
        <ScreenCapturePanelContent
          layoutOption={props.layoutOption}
          requiresSavedState={false}
          reportType={PNG_REPORT_TYPE_V2}
          apiClient={apiClient}
          toasts={core.notifications.toasts}
          uiSettings={core.uiSettings}
          {...props}
        />
      );
    },
  };
}
