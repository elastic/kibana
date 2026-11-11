/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Which eval scores a stored dataset, and so which spec file registers it. */
export type StoredDatasetEval = 'investigation' | 'connector-probe';

/**
 * A dataset stored on the evaluations cluster, by its exact `name`. `id` names it in
 * `NIGHTSHIFT_DATASETS` and in the Playwright describe title; scores are attributed to `name`.
 * `shard` is the CI shard in `evals.suites.json` that runs it.
 */
export interface StoredDataset {
  id: string;
  eval: StoredDatasetEval;
  shard: string;
  name: string;
  /** Fails the run before any example runs when the loaded dataset lacks one of these tags. */
  requiredTags?: readonly string[];
}

/** The stored datasets CI runs, each in the shard it names. */
export const STORED_DATASETS: readonly StoredDataset[] = [
  {
    id: 'golden',
    eval: 'investigation',
    shard: 'customer0-golden',
    // Pinned so PR, weekly and daily runs share one baseline. Moving to a new cut is a change here.
    name: 'ns-investigation-golden-2710',
    // getDatasetCustomContext applies the Customer-0 context and retrospective guardrail by tag.
    requiredTags: ['customer0'],
  },
  {
    id: 'connector-elastic',
    eval: 'connector-probe',
    shard: 'customer0-connector-probes',
    name: 'nightshift/ns-connector-elastic',
  },
];

/** The ids of the stored datasets a CI shard runs; empty for any other shard. */
export const storedDatasetIdsForShard = (
  shardId: string | undefined,
  datasets: readonly StoredDataset[] = STORED_DATASETS
): string[] => datasets.filter(({ shard }) => shard === shardId).map(({ id }) => id);

/** The stored datasets with the given ids that the given eval scores, in config order. */
export const selectStoredDatasets = (
  storedEval: StoredDatasetEval,
  ids: readonly string[],
  datasets: readonly StoredDataset[] = STORED_DATASETS
): StoredDataset[] =>
  datasets.filter((dataset) => dataset.eval === storedEval && ids.includes(dataset.id));

/** Throws when a loaded stored dataset lacks one of its entry's `requiredTags`. */
export const assertStoredDatasetTags = (
  { id, name, requiredTags = [] }: StoredDataset,
  tags: readonly string[] = []
): void => {
  const missingTags = requiredTags.filter((tag) => !tags.includes(tag));
  if (missingTags.length > 0) {
    throw new Error(
      `Stored dataset "${id}": "${name}" is missing the required tag(s) ${missingTags.join(
        ', '
      )}. Tag the dataset, then re-run.`
    );
  }
};
