/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Most repositories one batch may name; matches the old `repositories[]` config bound. */
export const MAX_BATCH_REPOSITORIES = 32;

/** One repository and optional revision a caller asks a batch to extract. */
export interface BatchRepositoryRequest {
  readonly repository: string;
  /** Defaults to the repository's `defaultRef` from the settings index. */
  readonly revision?: string;
}

export type RepositoryExtractionState = 'pending' | 'running' | 'completed' | 'failed';

/** Progress and outcome of one repository inside a batch. */
export interface RepositoryExtractionStatus {
  readonly repository: string;
  readonly revision: string;
  /** The commit every read used, once the revision has been resolved. */
  readonly commitSha?: string;
  readonly status: RepositoryExtractionState;
  readonly counts: Readonly<Record<string, number>>;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly startedAt?: string;
  readonly completedAt?: string;
}

/** `partial` means at least 1 repository completed and at least 1 failed. */
export type ExtractionBatchState = 'running' | 'completed' | 'failed' | 'partial';

export interface ExtractionBatchStatus {
  readonly id: string;
  readonly status: ExtractionBatchState;
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly repositories: readonly RepositoryExtractionStatus[];
}
