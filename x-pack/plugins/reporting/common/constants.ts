/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const QUEUE_DOCTYPE = 'esqueue';

export const JOB_COMPLETION_NOTIFICATIONS_SESSION_KEY =
  'xpack.reporting.jobCompletionNotifications';

export const API_BASE_URL = '/api/reporting';

export const WHITELISTED_JOB_CONTENT_TYPES = [
  'application/json',
  'application/pdf',
  'text/csv',
  'image/png',
];

export const KBN_SCREENSHOT_HEADER_BLACKLIST = [
  'accept-encoding',
  'content-length',
  'content-type',
  'host',
  'referer',
  // `Transfer-Encoding` is hop-by-hop header that is meaningful
  // only for a single transport-level connection, and shouldn't
  // be stored by caches or forwarded by proxies.
  'transfer-encoding',
];

export const UI_SETTINGS_CUSTOM_PDF_LOGO = 'xpackReporting:customPdfLogo';

/**
 * The type name used within the Monitoring index to publish reporting stats.
 * @type {string}
 */
export const KIBANA_REPORTING_TYPE = 'reporting';

export const PDF_JOB_TYPE = 'printable_pdf';
export const PNG_JOB_TYPE = 'PNG';
export const CSV_JOB_TYPE = 'csv';
export const USES_HEADLESS_JOB_TYPES = [PDF_JOB_TYPE, PNG_JOB_TYPE];
