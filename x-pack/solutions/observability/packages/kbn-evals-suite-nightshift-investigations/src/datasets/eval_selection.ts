/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseRequestedIds } from './select_datasets';

/** `NIGHTSHIFT_DATASETS` id for the file-driven investigation eval; every other id is a smoke dataset. */
export const INVESTIGATION_DATASET_ID = 'trace-only';

export interface EvalSelection {
  runSmoke: boolean;
  runInvestigations: boolean;
  /** Smoke dataset ids for `selectDatasets`; `undefined` runs them all. Unused when `runSmoke` is false. */
  smokeDatasetsRequest: string | undefined;
  /** True when an unset selection fell back to smoke because no sandbox credentials were found. */
  fellBackToSmoke: boolean;
}

/** Resolves which evals run from `NIGHTSHIFT_DATASETS` and the presence of sandbox credentials. */
export const resolveEvalSelection = (
  env: Record<string, string | undefined> = process.env
): EvalSelection => {
  const ids = parseRequestedIds(env.NIGHTSHIFT_DATASETS);
  const hasSandbox = Boolean(env.SANDBOX_API_KEY);

  if (!ids) {
    return {
      runSmoke: true,
      runInvestigations: hasSandbox,
      smokeDatasetsRequest: undefined,
      fellBackToSmoke: !hasSandbox && !env.NIGHTSHIFT_DATASETS?.trim(),
    };
  }

  const smokeIds = ids.filter((id) => id !== INVESTIGATION_DATASET_ID);
  const runInvestigations = ids.includes(INVESTIGATION_DATASET_ID);
  // Playwright resolves this on every run; a reused Scout server never reloads its config.
  if (runInvestigations && !hasSandbox) {
    throw new Error(
      `NIGHTSHIFT_DATASETS includes ${INVESTIGATION_DATASET_ID}, which runs investigation evals, but ` +
        'SANDBOX_API_KEY is required; use --profile dev-vault, export SANDBOX_*, or select only smoke datasets.'
    );
  }

  return {
    runSmoke: smokeIds.length > 0,
    runInvestigations,
    smokeDatasetsRequest: smokeIds.length > 0 ? smokeIds.join(',') : undefined,
    fellBackToSmoke: false,
  };
};
