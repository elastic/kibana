/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Investigation } from '@kbn/agentic-investigations-plugin/common';

/**
 * Where an investigation is, from the point of view of a consumer rendering it:
 * - `loading` — the first read has not returned yet.
 * - `running` — an agent or driver workflow is working on it; findings appear as they are recorded.
 * - `complete` — nothing is working on it; what it recorded is final until a follow-up.
 * - `unavailable` — it could not be read (for example missing privileges, or it does not exist).
 */
export type InvestigationStatus = 'loading' | 'running' | 'complete' | 'unavailable';

export interface InvestigationOutputProps {
  status: InvestigationStatus;
  /** The investigation from the shared investigations API, once read. */
  investigation?: Investigation;
  /** Detail message for the `unavailable` status. */
  error?: string;
}
