/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseRequestedIds } from './select_datasets';
import { STORED_DATASETS, STORED_DATASET_SHARDS } from './stored_datasets';

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

const EVAL_IDS: readonly string[] = [
  INVESTIGATION_DATASET_ID,
  CONNECTOR_PROBE_DATASET_ID,
  WIKI_OPTIMIZE_DATASET_ID,
];
/** Stored dataset ids are opt-in too: they run live investigations, so unset and `all` skip them. */
const STORED_DATASET_IDS: readonly string[] = STORED_DATASETS.map(({ id }) => id);

export interface EvalSelection {
  runSmoke: boolean;
  runInvestigations: boolean;
  runOrca: boolean;
  runConnectorProbes: boolean;
  runWikiOptimize: boolean;
  /** Ids from `STORED_DATASETS` to run; their CI shard selects every entry of its eval. */
  storedDatasetIds: string[];
  /** Smoke dataset ids for `selectDatasets`; `undefined` runs them all. Unused when `runSmoke` is false. */
  smokeDatasetsRequest: string | undefined;
  /** True when an unset selection fell back to smoke because no sandbox credentials were found. */
  fellBackToSmoke: boolean;
}

/**
 * Stored datasets query Customer-0 live. Without the `default` connector set the investigator has no
 * Elasticsearch connector, so the run would score low instead of failing.
 */
const assertDefaultConnectorSet = (
  env: Record<string, string | undefined>,
  selected: string
): void => {
  if (env.NIGHTSHIFT_CONNECTOR_SET !== 'default') {
    throw new Error(
      `${selected} queries Customer-0 live and requires a Scout server started with the default ` +
        'connector set (nightshift.telemetry in the evals config, or NIGHTSHIFT_ES_URL and NIGHTSHIFT_ES_API_KEY)'
    );
  }
};

/** Resolves which evals run from `NIGHTSHIFT_DATASETS` and the presence of sandbox credentials. */
export const resolveEvalSelection = (
  env: Record<string, string | undefined> = process.env
): EvalSelection => {
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
      runWikiOptimize: false,
      storedDatasetIds: [],
      smokeDatasetsRequest: undefined,
      fellBackToSmoke: false,
    };
  }
  const storedShardEval = STORED_DATASET_SHARDS.get(env.EVAL_SHARD_ID ?? '');
  if (storedShardEval) {
    if (!env.SANDBOX_API_KEY) {
      throw new Error(`The ${env.EVAL_SHARD_ID} shard requires SANDBOX_API_KEY`);
    }
    assertDefaultConnectorSet(env, `The ${env.EVAL_SHARD_ID} shard`);
    return {
      runSmoke: false,
      runInvestigations: false,
      runOrca: false,
      runConnectorProbes: false,
      runWikiOptimize: false,
      storedDatasetIds: STORED_DATASETS.filter((dataset) => dataset.eval === storedShardEval).map(
        ({ id }) => id
      ),
      smokeDatasetsRequest: undefined,
      fellBackToSmoke: false,
    };
  }
  if (env.NIGHTSHIFT_DATASETS?.split(',').some((id) => id.trim() === 'orcabench')) {
    throw new Error('Run orcabench on its own Scout server; it needs the orcabench connector set');
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
      runConnectorProbes: false,
      runWikiOptimize: false,
      storedDatasetIds: [],
      smokeDatasetsRequest: undefined,
      fellBackToSmoke: !hasSandbox,
    };
  }

  const smokeIds = ids.filter((id) => !EVAL_IDS.includes(id) && !STORED_DATASET_IDS.includes(id));
  const runInvestigations = ids.includes(INVESTIGATION_DATASET_ID);
  if (runInvestigations) requiresSandbox(INVESTIGATION_DATASET_ID);
  const runConnectorProbes = ids.includes(CONNECTOR_PROBE_DATASET_ID);
  if (runConnectorProbes) requiresSandbox(CONNECTOR_PROBE_DATASET_ID);
  const storedDatasetIds = ids.filter((id) => STORED_DATASET_IDS.includes(id));
  storedDatasetIds.forEach(requiresSandbox);
  if (storedDatasetIds.length > 0) {
    assertDefaultConnectorSet(env, `NIGHTSHIFT_DATASETS=${requested}`);
  }

  return {
    runOrca: false,
    runSmoke: smokeIds.length > 0,
    runInvestigations,
    runConnectorProbes,
    runWikiOptimize: ids.includes(WIKI_OPTIMIZE_DATASET_ID),
    storedDatasetIds,
    smokeDatasetsRequest: smokeIds.length > 0 ? smokeIds.join(',') : undefined,
    fellBackToSmoke: false,
  };
};
