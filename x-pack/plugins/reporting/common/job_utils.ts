/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CSV_JOB_TYPE, CSV_JOB_TYPE_V2 } from '@kbn/reporting-export-types-csv-common';
import { PDF_JOB_TYPE_V2 } from '@kbn/reporting-export-types-pdf-common';
import { PNG_JOB_TYPE_V2 } from '@kbn/reporting-export-types-png-common';

// TODO: Remove this code once the enabled CSV export type is using the new format
export const isJobV2Params = ({ sharingData }: { sharingData: Record<string, unknown> }): boolean =>
  sharingData.locatorParams != null;

export const prettyPrintJobType = (type: string) => {
  switch (type) {
    case 'pdf':
    case 'printable_pdf':
    case PDF_JOB_TYPE_V2:
      return 'PDF';
    case 'csv':
    case CSV_JOB_TYPE:
    case CSV_JOB_TYPE_V2:
      return 'CSV';
    case 'png':
    case PNG_JOB_TYPE_V2:
      return 'PNG';
    default:
      return type;
  }
};
