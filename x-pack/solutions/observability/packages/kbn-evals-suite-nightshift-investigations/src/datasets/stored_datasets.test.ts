/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatasetSummary } from '@kbn/evals-common';
import {
  STORED_DATASETS,
  STORED_DATASET_SHARDS,
  resolveStoredDatasetName,
  selectStoredDatasets,
  type StoredDataset,
} from './stored_datasets';

const NOW = Date.parse('2026-11-03T00:00:00.000Z');

const GOLDEN: StoredDataset = {
  id: 'golden',
  eval: 'investigation',
  latest: {
    namePattern: /^ns-investigation-golden-\d{4}$/,
    search: 'ns-investigation-golden',
    maxAgeDays: 90,
    requiredTags: ['customer0'],
  },
};

const summary = (
  name: string,
  createdAt: string,
  tags: string[] = ['nightshift', 'customer0']
): DatasetSummary => ({
  id: `${name}-id`,
  name,
  description: '',
  tags,
  examples_count: 1,
  created_at: createdAt,
  updated_at: createdAt,
});

const listing = (...pages: DatasetSummary[][]) => {
  const total = pages.flat().length;
  const listDatasets = jest.fn();
  for (const datasets of pages) listDatasets.mockResolvedValueOnce({ datasets, total });
  return { listDatasets };
};

describe('resolveStoredDatasetName', () => {
  it('returns a fixed name without listing', async () => {
    const client = listing();
    await expect(
      resolveStoredDatasetName(client, { id: 'probes', eval: 'connector-probe', name: 'ns/x' }, NOW)
    ).resolves.toBe('ns/x');
    expect(client.listDatasets).not.toHaveBeenCalled();
  });

  it('picks the most recently created exact match, whatever its date suffix says', async () => {
    // Loose search hits come first. The suffix is DDMM, so 0111 (1 November) is newer than
    // 2710 (27 October) although it sorts lower by name.
    const client = listing([
      summary('nightshift/ns-investigation-golden-0111-sub', '2026-11-02T00:00:00.000Z'),
      summary('ns-investigation-golden-0111', '2026-11-01T00:00:00.000Z'),
      summary('ns-investigation-golden-2710', '2026-10-27T00:00:00.000Z'),
    ]);
    await expect(resolveStoredDatasetName(client, GOLDEN, NOW)).resolves.toBe(
      'ns-investigation-golden-0111'
    );
    expect(client.listDatasets).toHaveBeenCalledWith({
      search: 'ns-investigation-golden',
      sort_field: 'created_at',
      sort_order: 'desc',
      page: 1,
      per_page: 100,
    });
  });

  it('pages on until it finds a match', async () => {
    const noise = Array.from({ length: 100 }, (_, index) =>
      summary(`other-${index}`, '2026-11-02T00:00:00.000Z')
    );
    const client = listing(noise, [summary('ns-investigation-golden-2710', '2026-10-27')]);
    await expect(resolveStoredDatasetName(client, GOLDEN, NOW)).resolves.toBe(
      'ns-investigation-golden-2710'
    );
    expect(client.listDatasets).toHaveBeenCalledTimes(2);
  });

  it('fails when nothing matches', async () => {
    const client = listing([summary('ns-investigation-golden-27-10', '2026-10-27')]);
    await expect(resolveStoredDatasetName(client, GOLDEN, NOW)).rejects.toThrow(
      'no dataset on the evaluations cluster matches'
    );
  });

  it('fails when the newest match is older than maxAgeDays', async () => {
    const client = listing([summary('ns-investigation-golden-0108', '2026-08-01T00:00:00.000Z')]);
    await expect(resolveStoredDatasetName(client, GOLDEN, NOW)).rejects.toThrow(
      '"ns-investigation-golden-0108", was created 94 days ago, over the 90-day limit'
    );
  });

  it('fails on an unreadable creation date rather than treating it as fresh', async () => {
    const client = listing([summary('ns-investigation-golden-2710', 'not a date')]);
    await expect(resolveStoredDatasetName(client, GOLDEN, NOW)).rejects.toThrow('90-day limit');
  });

  it.each([
    ['without the tag', ['nightshift']],
    ['without tags', undefined],
  ])(
    'fails when the newest match is %s instead of falling back to an older tagged cut',
    async (_label, tags) => {
      const newest = summary('ns-investigation-golden-0111', '2026-11-01T00:00:00.000Z');
      const client = listing([
        { ...newest, tags },
        summary('ns-investigation-golden-2710', '2026-10-27T00:00:00.000Z'),
      ]);
      await expect(resolveStoredDatasetName(client, GOLDEN, NOW)).rejects.toThrow(
        '"ns-investigation-golden-0111", is missing the required tag(s) customer0'
      );
    }
  );
});

describe('stored dataset config', () => {
  it('gives every entry a unique id and an eval with a CI shard', () => {
    const ids = STORED_DATASETS.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    const shardEvals = new Set(STORED_DATASET_SHARDS.values());
    for (const dataset of STORED_DATASETS) expect(shardEvals.has(dataset.eval)).toBe(true);
  });

  it('selects entries by eval and id, in config order', () => {
    expect(
      selectStoredDatasets('investigation', ['connector-elastic', 'golden']).map(({ id }) => id)
    ).toEqual(['golden']);
    expect(selectStoredDatasets('connector-probe', ['golden'])).toEqual([]);
  });

  it('requires the customer0 tag on golden cuts, so the retrospective guardrail applies', () => {
    const golden = STORED_DATASETS.find(({ id }) => id === 'golden');
    expect(golden && 'latest' in golden && golden.latest.requiredTags).toEqual(['customer0']);
  });
});
