/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvalsClient } from '@kbn/evals';

/** Which eval scores a stored dataset, and so which `stored-*` CI shard runs it. */
export type StoredDatasetEval = 'investigation' | 'connector-probe';

/** Picks the newest dataset whose name matches, so a new cut is picked up without a code change. */
export interface LatestStoredDataset {
  /** The names to choose from; the most recently created match wins. */
  namePattern: RegExp;
  /** Narrows the server-side listing. The server matches it loosely; `namePattern` decides. */
  search: string;
  /** Fails the run when the newest match is older than this many days. */
  maxAgeDays: number;
}

/**
 * A dataset stored on the evaluations cluster. `id` names it in `NIGHTSHIFT_DATASETS` and in the
 * Playwright describe title; scores are attributed to the stored dataset's own name.
 */
export type StoredDataset = { id: string; eval: StoredDatasetEval } & (
  | { name: string }
  | { latest: LatestStoredDataset }
);

/**
 * The stored datasets the daily pipeline runs. Adding an entry adds it to the daily run: the
 * `stored-investigations` and `stored-connector-probes` shards run every entry of their eval.
 */
export const STORED_DATASETS: readonly StoredDataset[] = [
  {
    id: 'golden',
    eval: 'investigation',
    latest: {
      namePattern: /^ns-investigation-golden-\d{4}$/,
      search: 'ns-investigation-golden',
      // Provisional. Alternatives under discussion: the cut's `refresh-by:YYYY-MM-DD` tag, or a
      // limit derived from the ~6-month retention of the incidents' live telemetry.
      maxAgeDays: 90,
    },
  },
  { id: 'connector-elastic', eval: 'connector-probe', name: 'nightshift/ns-connector-elastic' },
];

/** The CI shard that runs each eval's stored datasets, as named in `evals.suites.json`. */
export const STORED_DATASET_SHARDS: ReadonlyMap<string, StoredDatasetEval> = new Map([
  ['stored-investigations', 'investigation'],
  ['stored-connector-probes', 'connector-probe'],
]);

/** The stored datasets with the given ids that the given eval scores, in config order. */
export const selectStoredDatasets = (
  storedEval: StoredDatasetEval,
  ids: readonly string[],
  datasets: readonly StoredDataset[] = STORED_DATASETS
): StoredDataset[] =>
  datasets.filter((dataset) => dataset.eval === storedEval && ids.includes(dataset.id));

const DAY_MS = 24 * 60 * 60 * 1000;
const LIST_PAGE_SIZE = 100;

/**
 * Resolves the stored dataset name to load: a fixed name as is, or the most recently created
 * dataset matching `latest`. Throws when nothing matches or the newest match is too old.
 */
export const resolveStoredDatasetName = async (
  client: Pick<EvalsClient, 'listDatasets'>,
  dataset: StoredDataset,
  now: number = Date.now()
): Promise<string> => {
  if ('name' in dataset) return dataset.name;

  const { namePattern, search, maxAgeDays } = dataset.latest;
  // Newest first, so the first match on the earliest page is the newest match overall.
  for (let page = 1; ; page++) {
    const { datasets, total } = await client.listDatasets({
      search,
      sort_field: 'created_at',
      sort_order: 'desc',
      page,
      per_page: LIST_PAGE_SIZE,
    });
    const newest = datasets.find(({ name }) => namePattern.test(name));
    if (newest) {
      // NaN for an unreadable date, which fails the check below rather than passing as fresh.
      const ageDays = Math.floor((now - Date.parse(newest.created_at)) / DAY_MS);
      if (!(ageDays <= maxAgeDays)) {
        throw new Error(
          `Stored dataset "${dataset.id}": the newest match for ${namePattern}, "${newest.name}", ` +
            `was created ${ageDays} days ago, over the ${maxAgeDays}-day limit. ` +
            'Publish a new cut, or change maxAgeDays in src/datasets/stored_datasets.ts.'
        );
      }
      return newest.name;
    }
    if (datasets.length === 0 || page * LIST_PAGE_SIZE >= total) {
      throw new Error(
        `Stored dataset "${dataset.id}": no dataset on the evaluations cluster matches ${namePattern}`
      );
    }
  }
};
