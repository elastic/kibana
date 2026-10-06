/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Stable codes the start-extraction route returns in `attributes.code`; the UI keys on these, not on message text. */
export const START_EXTRACTION_ERROR_CODES = {
  alreadyRunning: 'extraction_already_running',
  repositoryNotConfigured: 'repository_not_configured',
  noRepositories: 'no_repositories_to_extract',
  capacityExhausted: 'extraction_capacity_exhausted',
  sandboxUnavailable: 'sandbox_unavailable',
} as const;

export type StartExtractionErrorCode =
  (typeof START_EXTRACTION_ERROR_CODES)[keyof typeof START_EXTRACTION_ERROR_CODES];

/**
 * Kibana keeps only `message` and `attributes` from an error body, so the machine-readable
 * fields travel in `attributes`.
 */
export interface StartExtractionErrorAttributes {
  readonly code: StartExtractionErrorCode;
  /** Present when the refusal is about one repository, for example one that is not configured. */
  readonly repository?: string;
  /** The running batch, present only when the refusing instance tracks it. */
  readonly extractionId?: string;
}
