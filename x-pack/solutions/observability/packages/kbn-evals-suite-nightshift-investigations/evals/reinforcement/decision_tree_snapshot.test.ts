/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { restoreDecisionTree, snapshotDecisionTree } from './task';

const TREE_ID = 'symptom:checkout-high-latency';
const HEAD_ID = 'default:dtree_checkout-high-latency';

const versionHit = (version: number) => ({
  _id: `${HEAD_ID}_v${version}`,
  _source: { attributes: { version } },
  sort: [version, `2026-01-01T00:00:${String(version).padStart(2, '0')}.000Z`],
});

const searchPage = (versions: number[]) => ({
  hits: { hits: versions.map(versionHit) },
});

const client = ({
  get = jest.fn().mockResolvedValue({ found: false }),
  search = jest.fn().mockResolvedValue(searchPage([])),
  delete: deleteDoc = jest.fn().mockResolvedValue({}),
  index = jest.fn().mockResolvedValue({}),
}: {
  get?: jest.Mock;
  search?: jest.Mock;
  delete?: jest.Mock;
  index?: jest.Mock;
} = {}) =>
  ({ get, search, delete: deleteDoc, index } as unknown as Client & {
    get: jest.Mock;
    search: jest.Mock;
    delete: jest.Mock;
    index: jest.Mock;
  });

describe('snapshotDecisionTree', () => {
  it('reads every version page before treating the snapshot as complete', async () => {
    const search = jest
      .fn()
      .mockResolvedValueOnce(searchPage(Array.from({ length: 100 }, (_, index) => index + 1)))
      .mockResolvedValueOnce(searchPage([101]));
    const esClient = client({
      get: jest.fn().mockResolvedValue({ found: true, _source: { content: 'head' } }),
      search,
    });

    const docs = await snapshotDecisionTree(esClient, TREE_ID);

    expect(docs.map((doc) => doc.id)).toEqual([
      HEAD_ID,
      ...Array.from({ length: 101 }, (_, index) => `${HEAD_ID}_v${index + 1}`),
    ]);
    expect(search.mock.calls[1][0].search_after).toEqual(versionHit(100).sort);
  });

  it('aborts when the version search fails for a reason other than a missing index', async () => {
    const esClient = client({
      search: jest.fn().mockRejectedValue({
        statusCode: 404,
        meta: { body: { error: { type: 'search_phase_execution_exception' } } },
      }),
    });

    await expect(snapshotDecisionTree(esClient, TREE_ID)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('treats a missing index as no documents', async () => {
    const missing = {
      statusCode: 404,
      meta: { body: { error: { type: 'index_not_found_exception' } } },
    };
    const esClient = client({
      get: jest.fn().mockRejectedValue(missing),
      search: jest.fn().mockRejectedValue(missing),
    });

    await expect(snapshotDecisionTree(esClient, TREE_ID)).resolves.toEqual([]);
  });
});

describe('restoreDecisionTree', () => {
  it('does not delete when listing the current documents fails', async () => {
    const esClient = client({
      search: jest.fn().mockRejectedValue({ statusCode: 503 }),
    });

    await expect(restoreDecisionTree(esClient, TREE_ID, [])).rejects.toMatchObject({
      statusCode: 503,
    });
    expect(esClient.delete).not.toHaveBeenCalled();
    expect(esClient.index).not.toHaveBeenCalled();
  });

  it('puts the complete snapshot back after deleting what the replay left', async () => {
    const esClient = client({
      get: jest.fn().mockResolvedValue({ found: true, _source: { content: 'replay head' } }),
      search: jest.fn().mockResolvedValue(searchPage([1, 2])),
    });
    const snapshot = [{ id: `${HEAD_ID}_v1`, source: { content: 'original' } }];

    await restoreDecisionTree(esClient, TREE_ID, snapshot);

    expect(esClient.delete.mock.calls.map(([request]) => request.id)).toEqual([
      HEAD_ID,
      `${HEAD_ID}_v1`,
      `${HEAD_ID}_v2`,
    ]);
    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({ id: `${HEAD_ID}_v1`, document: { content: 'original' } })
    );
  });
});
