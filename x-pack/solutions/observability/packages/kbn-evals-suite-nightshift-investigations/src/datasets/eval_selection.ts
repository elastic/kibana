/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STORED_DATASETS, storedDatasetIdsForShard } from './stored_datasets';

/** `NIGHTSHIFT_DATASETS` id for the file-driven investigation eval, the one unset and `all` run. */
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

const ALL_DATASETS = 'all';
const EVAL_IDS: readonly string[] = [
  INVESTIGATION_DATASET_ID,
  CONNECTOR_PROBE_DATASET_ID,
  WIKI_OPTIMIZE_DATASET_ID,
];
/** Stored dataset ids are opt-in too: they run live investigations, so unset and `all` skip them. */
const STORED_DATASET_IDS: readonly string[] = STORED_DATASETS.map(({ id }) => id);

export interface EvalSelection {
  runInvestigations: boolean;
  runOrca: boolean;
  runConnectorProbes: boolean;
  runWikiOptimize: boolean;
  /** Ids from `STORED_DATASETS` to run; a CI shard selects the entries that name it. */
  storedDatasetIds: string[];
}

/** Parses `NIGHTSHIFT_DATASETS`; returns `undefined` when it is unset or selects `all`. */
const parseRequestedIds = (requested: string | undefined): string[] | undefined => {
  const normalized = requested?.trim();
  if (!normalized || normalized === ALL_DATASETS) return undefined;

  const ids = [...new Set(normalized.split(',').map((id) => id.trim()))];
  if (ids.some((id) => id.length === 0)) {
    throw new Error(
      'NIGHTSHIFT_DATASETS contains an empty item; expected a comma-separated list of dataset ids.'
    );
  }
  if (ids.includes(ALL_DATASETS)) return undefined;

  const availableIds = [...EVAL_IDS, ...STORED_DATASET_IDS];
  const unknownIds = ids.filter((id) => !availableIds.includes(id));
  if (unknownIds.length > 0) {
    throw new Error(
      `Unknown dataset(s) in NIGHTSHIFT_DATASETS: ${unknownIds.join(', ')}. ` +
        `Available: ${availableIds.join(', ')}, orcabench on its own, or "${ALL_DATASETS}".`
    );
  }
  return ids;
};

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

/** Resolves which evals run from the CI shard, `NIGHTSHIFT_DATASETS` and sandbox credentials. */
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
      runInvestigations: false,
      runOrca: true,
      runConnectorProbes: false,
      runWikiOptimize: false,
      storedDatasetIds: [],
    };
  }
  const shardDatasetIds = storedDatasetIdsForShard(env.EVAL_SHARD_ID);
  if (shardDatasetIds.length > 0) {
    if (!env.SANDBOX_API_KEY) {
      throw new Error(`The ${env.EVAL_SHARD_ID} shard requires SANDBOX_API_KEY`);
    }
    assertDefaultConnectorSet(env, `The ${env.EVAL_SHARD_ID} shard`);
    return {
      runInvestigations: false,
      runOrca: false,
      runConnectorProbes: false,
      runWikiOptimize: false,
      storedDatasetIds: shardDatasetIds,
    };
  }
  if (env.NIGHTSHIFT_DATASETS?.split(',').some((id) => id.trim() === 'orcabench')) {
    throw new Error('Run orcabench on its own Scout server; it needs the orcabench connector set');
  }
  const requested =
    env.NIGHTSHIFT_DATASETS?.trim() ||
    (env.NIGHTSHIFT_DATASET_NAME ? INVESTIGATION_DATASET_ID : undefined);
  const ids = parseRequestedIds(requested);
  const requiresSandbox = (selected: string) => {
    // Playwright resolves this on every run; a reused Scout server never reloads its config.
    if (!env.SANDBOX_API_KEY) {
      throw new Error(
        `NIGHTSHIFT_DATASETS=${
          requested ?? ALL_DATASETS
        } selects ${selected}, which runs investigation evals, ` +
          `but SANDBOX_API_KEY is required; use --profile dev-vault, export SANDBOX_*, or select only ${WIKI_OPTIMIZE_DATASET_ID}.`
      );
    }
  };

  if (!ids) {
    requiresSandbox(ALL_DATASETS);
    return {
      runOrca: false,
      runInvestigations: true,
      runConnectorProbes: false,
      runWikiOptimize: false,
      storedDatasetIds: [],
    };
  }

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
    runInvestigations,
    runConnectorProbes,
    runWikiOptimize: ids.includes(WIKI_OPTIMIZE_DATASET_ID),
    storedDatasetIds,
  };
};
