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
  runOrca: boolean;
  /** Smoke dataset ids for `selectDatasets`; `undefined` runs them all. Unused when `runSmoke` is false. */
  smokeDatasetsRequest: string | undefined;
  /** True when an unset selection fell back to smoke because no sandbox credentials were found. */
  fellBackToSmoke: boolean;
}

/** Resolves which evals run from `NIGHTSHIFT_DATASETS` and the presence of sandbox credentials. */
export const resolveEvalSelection = (
  env: Record<string, string | undefined> = process.env
): EvalSelection => {
  const orca = env.EVAL_SHARD_ID === 'orcabench' || env.NIGHTSHIFT_DATASETS?.trim() === 'orcabench';
  if (orca) {
    if (!env.SANDBOX_API_KEY) throw new Error('ORCA investigations require SANDBOX_API_KEY');
    if (!env.NIGHTSHIFT_ORCA_TELEMETRY) {
      throw new Error(
        'ORCA investigations require a Scout server started with the ORCA telemetry hook'
      );
    }
    return {
      runSmoke: false,
      runInvestigations: false,
      runOrca: true,
      smokeDatasetsRequest: undefined,
      fellBackToSmoke: false,
    };
  }
  if (env.NIGHTSHIFT_DATASETS?.split(',').some((id) => id.trim() === 'orcabench')) {
    throw new Error(
      'Run orcabench on its own Scout server; it cannot share the current telemetry target'
    );
  }
  const requested =
    env.NIGHTSHIFT_DATASETS?.trim() ||
    (env.NIGHTSHIFT_DATASET_NAME ? INVESTIGATION_DATASET_ID : undefined);
  const ids = parseRequestedIds(requested);
  const hasSandbox = Boolean(env.SANDBOX_API_KEY);
  const requiresSandbox = (selected: string) => {
    // Playwright resolves this on every run; a reused Scout server never reloads its config.
    if (!hasSandbox) {
      throw new Error(
        `NIGHTSHIFT_DATASETS=${requested} selects ${selected}, which runs investigation evals, but ` +
          'SANDBOX_API_KEY is required; use --profile dev-vault, export SANDBOX_*, or select only smoke datasets.'
      );
    }
  };

  if (!ids) {
    // Only a genuinely unset value falls back; an explicit `all` asked for investigations too.
    if (requested) requiresSandbox('all');
    return {
      runOrca: false,
      runSmoke: true,
      runInvestigations: hasSandbox,
      smokeDatasetsRequest: undefined,
      fellBackToSmoke: !hasSandbox,
    };
  }

  const smokeIds = ids.filter((id) => id !== INVESTIGATION_DATASET_ID);
  const runInvestigations = ids.includes(INVESTIGATION_DATASET_ID);
  if (runInvestigations) requiresSandbox(INVESTIGATION_DATASET_ID);

  return {
    runOrca: false,
    runSmoke: smokeIds.length > 0,
    runInvestigations,
    smokeDatasetsRequest: smokeIds.length > 0 ? smokeIds.join(',') : undefined,
    fellBackToSmoke: false,
  };
};
