/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CSV_JOB_TYPE, CSV_JOB_TYPE_DEPRECATED } from '@kbn/reporting-export-types-csv-common';
import { PDF_JOB_TYPE, PDF_JOB_TYPE_V2 } from '@kbn/reporting-export-types-pdf-common';
import { PNG_JOB_TYPE, PNG_JOB_TYPE_V2 } from '@kbn/reporting-export-types-png-common';

// TODO: Remove this code once everyone is using the new PDF format, then we can also remove the legacy
// export type entirely
export const isJobV2Params = ({ sharingData }: { sharingData: Record<string, unknown> }): boolean =>
  sharingData.locatorParams != null;

export const prettyPrintJobType = (type: string) => {
  switch (type) {
    case PDF_JOB_TYPE:
    case PDF_JOB_TYPE_V2:
      return 'PDF';
    case CSV_JOB_TYPE:
    case CSV_JOB_TYPE_DEPRECATED:
      return 'CSV';
    case PNG_JOB_TYPE:
    case PNG_JOB_TYPE_V2:
      return 'PNG';
    default:
      return type;
  }
};
