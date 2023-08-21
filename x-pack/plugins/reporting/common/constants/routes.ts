/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const prefixInternalPath = '/internal/reporting';
export const INTERNAL_ROUTES = {
  MIGRATE: {
    MIGRATE_ILM_POLICY: prefixInternalPath + '/deprecations/migrate_ilm_policy',
    GET_ILM_POLICY_STATUS: prefixInternalPath + '/ilm_policy_status',
  },
  DIAGNOSE: {
    BROWSER: prefixInternalPath + '/diagnose/browser',
    SCREENSHOT: prefixInternalPath + '/diagnose/screenshot',
  },
  JOBS: {
    COUNT: prefixInternalPath + '/jobs/count',
    LIST: prefixInternalPath + '/jobs/list',
    INFO_PREFIX: prefixInternalPath + '/jobs/info', // docId is added to the final path
    DELETE_PREFIX: prefixInternalPath + '/jobs/delete', // docId is added to the final path
    DOWNLOAD_PREFIX: prefixInternalPath + '/jobs/download', // docId is added to the final path
  },
  DOWNLOAD_CSV: prefixInternalPath + '/generate/immediate/csv_searchsource',
  GENERATE_PREFIX: prefixInternalPath + '/generate', // exportTypeId is added to the final path
};

const prefixPublicPath = '/api/reporting';
export const PUBLIC_ROUTES = {
  /**
   * Public endpoint for POST URL strings and automated report generation
   * exportTypeId is added to the final path
   */
  GENERATE_PREFIX: prefixPublicPath + `/generate`,
  JOBS: {
    /**
     * Public endpoint used by Watcher and automated report downloads
     * jobId is added to the final path
     */
    DOWNLOAD_PREFIX: prefixPublicPath + `/jobs/download`,
    /**
     * Public endpoint potentially used to delete a report after download in automation
     * jobId is added to the final path
     */
    DELETE_PREFIX: prefixPublicPath + `/jobs/delete`,
  },
};
