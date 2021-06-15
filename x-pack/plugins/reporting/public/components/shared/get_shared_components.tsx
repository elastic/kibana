/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from 'kibana/public';
import React from 'react';
import { ReportingAPIClient } from '../..';
import { PDF_REPORT_TYPE } from '../../../common/constants';
import type { Props as PanelPropsScreenCapture } from '../screen_capture_panel_content';
import { ScreenCapturePanelContent } from '../screen_capture_panel_content_lazy';

interface IncludeOnCloseFn {
  onClose: () => void;
}

type PropsPDF = Pick<PanelPropsScreenCapture, 'getJobParams' | 'layoutOption'> & IncludeOnCloseFn;

/*
 * As of 7.14, the only shared component is a PDF report that is suited for Canvas integration.
 * This is not planned to expand, as work is to be done on moving the export-type implementations out of Reporting
 * Related Discuss issue: https://github.com/elastic/kibana/issues/101422
 */
export function getSharedComponents(core: CoreSetup) {
  return {
    ReportingPanelPDF(props: PropsPDF) {
      return (
        <ScreenCapturePanelContent
          layoutOption={props.layoutOption}
          requiresSavedState={false}
          reportType={PDF_REPORT_TYPE}
          apiClient={new ReportingAPIClient(core.http)}
          toasts={core.notifications.toasts}
          {...props}
        />
      );
    },
  };
}
