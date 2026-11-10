/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseRequestedIds } from './select_datasets';

/** `NIGHTSHIFT_DATASETS` id for the file-driven investigation eval; every other id is a smoke dataset. */
export const INVESTIGATION_DATASET_ID = 'trace-only';
/**
 * `NIGHTSHIFT_DATASETS` id for the Nightshift assistant connector probes. Opt-in only: it needs an
 * Elasticsearch connector, so unset and `all` never select it.
 */
export const CONNECTOR_PROBE_DATASET_ID = 'connector-probe';
/**
 * `NIGHTSHIFT_DATASETS` id for the Wiki optimizer replay. Opt-in only, like the connector probes,
 * but it needs no sandbox credentials: it replays saved rounds through the optimizer and runs no
 * investigation.
 */
export const WIKI_OPTIMIZE_DATASET_ID = 'wiki-optimize';

/**
 * `NIGHTSHIFT_DATASETS` id for the reinforcement micro-eval. Opt-in: it enables decision trees
 * on the Scout server, so it needs its own server. Unset and `all` never select it.
 */
export const REINFORCEMENT_DATASET_ID = 'reinforcement';

const EVAL_IDS: readonly string[] = [
  INVESTIGATION_DATASET_ID,
  CONNECTOR_PROBE_DATASET_ID,
  REINFORCEMENT_DATASET_ID,
  WIKI_OPTIMIZE_DATASET_ID,
];

export interface EvalSelection {
  runSmoke: boolean;
  runInvestigations: boolean;
  runOrca: boolean;
  runConnectorProbes: boolean;
  /**
   * True only when `NIGHTSHIFT_DATASETS` lists `reinforcement` or `EVAL_SHARD_ID` is
   * `reinforcement`. Not part of an unset or `all` run.
   */
  runReinforcement: boolean;
  runWikiOptimize: boolean;
  /** Smoke dataset ids for `selectDatasets`; `undefined` runs them all. Unused when `runSmoke` is false. */
  smokeDatasetsRequest: string | undefined;
  /** True when an unset selection fell back to smoke because no sandbox credentials were found. */
  fellBackToSmoke: boolean;
}

/**
 * Resolves which evals run from the CI shard (`EVAL_SHARD_ID`), `NIGHTSHIFT_DATASETS` and the
 * presence of sandbox credentials.
 */
export const resolveEvalSelection = (
  env: Record<string, string | undefined> = process.env
): EvalSelection => {
  // The reinforcement eval seeds its own trees and keeps learning on, so it never restores
  // knowledge: the switch would only load credentials and turn systems on for nothing.
  const reinforcementSelected =
    env.EVAL_SHARD_ID === REINFORCEMENT_DATASET_ID ||
    (env.NIGHTSHIFT_DATASETS ?? '').split(',').some((id) => id.trim() === REINFORCEMENT_DATASET_ID);
  if (reinforcementSelected && env.NIGHTSHIFT_KNOWLEDGE?.trim()) {
    throw new Error(
      'Run reinforcement without NIGHTSHIFT_KNOWLEDGE; it seeds its own decision trees and never restores knowledge'
    );
  }
  // The CI reinforcement shard runs on its own Scout server, which its scout hook starts with
  // decision trees on.
  if (env.EVAL_SHARD_ID === REINFORCEMENT_DATASET_ID) {
    if (!env.SANDBOX_API_KEY) {
      throw new Error('The reinforcement shard runs agent evals, so SANDBOX_API_KEY is required');
    }
    return {
      runSmoke: false,
      runInvestigations: false,
      runOrca: false,
      runConnectorProbes: false,
      runReinforcement: true,
      runWikiOptimize: false,
      smokeDatasetsRequest: undefined,
      fellBackToSmoke: false,
    };
  }
  const orca = env.EVAL_SHARD_ID === 'orcabench' || env.NIGHTSHIFT_DATASETS?.trim() === 'orcabench';
  if (orca) {
    if (!env.SANDBOX_API_KEY) throw new Error('ORCA investigations require SANDBOX_API_KEY');
    if (env.NIGHTSHIFT_CONNECTOR_SET !== 'orcabench') {
      throw new Error(
        'ORCA investigations require a Scout server started with the orcabench connector set'
      );
    }
    return {
      runSmoke: false,
      runInvestigations: false,
      runOrca: true,
      runConnectorProbes: false,
      runReinforcement: false,
      runWikiOptimize: false,
      smokeDatasetsRequest: undefined,
      fellBackToSmoke: false,
    };
  }
  if (env.NIGHTSHIFT_DATASETS?.split(',').some((id) => id.trim() === 'orcabench')) {
    throw new Error('Run orcabench on its own Scout server; it needs the orcabench connector set');
  }
  const listedIds = (env.NIGHTSHIFT_DATASETS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
  if (
    listedIds.includes(REINFORCEMENT_DATASET_ID) &&
    listedIds.some((id) => id !== REINFORCEMENT_DATASET_ID)
  ) {
    throw new Error(
      'Run reinforcement on its own Scout server; it enables decision trees on the server'
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
        `NIGHTSHIFT_DATASETS=${requested} selects ${selected}, which runs agent evals, but ` +
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
      runConnectorProbes: false,
      runReinforcement: false,
      runWikiOptimize: false,
      smokeDatasetsRequest: undefined,
      fellBackToSmoke: !hasSandbox,
    };
  }

  const smokeIds = ids.filter((id) => !EVAL_IDS.includes(id));
  const runInvestigations = ids.includes(INVESTIGATION_DATASET_ID);
  const runReinforcement = ids.includes(REINFORCEMENT_DATASET_ID);
  if (runInvestigations) requiresSandbox(INVESTIGATION_DATASET_ID);
  const runConnectorProbes = ids.includes(CONNECTOR_PROBE_DATASET_ID);
  if (runConnectorProbes) requiresSandbox(CONNECTOR_PROBE_DATASET_ID);
  if (runReinforcement) requiresSandbox(REINFORCEMENT_DATASET_ID);

  return {
    runOrca: false,
    runSmoke: smokeIds.length > 0,
    runInvestigations,
    runConnectorProbes,
    runReinforcement,
    runWikiOptimize: ids.includes(WIKI_OPTIMIZE_DATASET_ID),
    smokeDatasetsRequest: smokeIds.length > 0 ? smokeIds.join(',') : undefined,
    fellBackToSmoke: false,
  };
};
