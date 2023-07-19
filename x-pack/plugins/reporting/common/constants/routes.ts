/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const INTERNAL_API_PREFIX = '/_internal/reporting';
export const INTERNAL_ROUTES = {
  MIGRATE: {
    MIGRATE_ILM_POLICY: INTERNAL_API_PREFIX + '/ilm_policy',
    GET_ILM_POLICY_STATUS: INTERNAL_API_PREFIX + '/ilm_policy_status',
  },
  DIAGNOSE: {
    BROWSER: INTERNAL_API_PREFIX + '/diagnose/browser',
    SCREENSHOT: INTERNAL_API_PREFIX + '/diagnose/screenshot',
  },
  JOBS: {
    COUNT: INTERNAL_API_PREFIX + '/jobs/count',
    LIST: INTERNAL_API_PREFIX + '/jobs/list',
    INFO_PREFIX: INTERNAL_API_PREFIX + '/jobs/info', // docId is added to the final path
    DELETE_PREFIX: INTERNAL_API_PREFIX + '/jobs/delete', // docId is added to the final path
    DOWNLOAD_PREFIX: INTERNAL_API_PREFIX + '/jobs/download', // docId is added to the final path
  },
  GENERATE: {
    CSV_IMMEDIATE: INTERNAL_API_PREFIX + '/generate/immediate/csv_searchsource',
    EXPORT_TYPE_PREFIX: INTERNAL_API_PREFIX + '/generate', // exportTypeId is added to the final path
  },
};

export const PUBLIC_ROUTES = {
  GENERATE_PREFIX: `/api/reporting/generate`, // public endpoint for POST URL strings, exportTypeId is added to the final path
  DOWNLOAD_PREFIX: `/api/reporting/download`, // public endpoint used by Watcher, jobId is added to the final path
};
