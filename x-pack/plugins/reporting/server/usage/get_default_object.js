/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const AVAILABLE_TOTAL_FIELDS = { available: false, total: 0 };
const STATUS_FIELDS = { status: { completed: 0, failed: 0 } }; // these are just the common statuses
const PDF_APP_FIELDS = { app: { visualization: 0, dashboard: 0 } };
const PDF_LAYOUT_FIELDS = { layout: { print: 0, preserve_layout: 0 } };

export const getDefaultObject = () => ({
  available: false,
  enabled: true,
  browser_type: 'chromium',
  _all: 0,
  csv: AVAILABLE_TOTAL_FIELDS,
  PNG: AVAILABLE_TOTAL_FIELDS,
  printable_pdf: { ...AVAILABLE_TOTAL_FIELDS, ...PDF_APP_FIELDS, ...PDF_LAYOUT_FIELDS },
  ...STATUS_FIELDS,
  lastDay: {
    _all: 0,
    csv: AVAILABLE_TOTAL_FIELDS,
    PNG: AVAILABLE_TOTAL_FIELDS,
    printable_pdf: { ...AVAILABLE_TOTAL_FIELDS, ...PDF_APP_FIELDS, ...PDF_LAYOUT_FIELDS },
    ...STATUS_FIELDS,
  },
  last7Days: {
    _all: 0,
    csv: AVAILABLE_TOTAL_FIELDS,
    PNG: AVAILABLE_TOTAL_FIELDS,
    printable_pdf: { ...AVAILABLE_TOTAL_FIELDS, ...PDF_APP_FIELDS, ...PDF_LAYOUT_FIELDS },
    ...STATUS_FIELDS,
  },
});
