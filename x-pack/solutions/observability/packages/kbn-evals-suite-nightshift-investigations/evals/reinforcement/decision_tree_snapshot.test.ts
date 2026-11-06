/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import {
  listDecisionTreeIds,
  restoreDecisionTree,
  restoreDecisionTrees,
  snapshotDecisionTree,
  snapshotDecisionTrees,
} from './task';

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

const headHit = (treeId: string) => ({
  _id: `default:dtree_${treeId.replace(/^symptom:/, '')}`,
  _source: { attributes: { tree_id: treeId } },
});

interface SearchRequest {
  query: { bool: { filter: Array<{ term: Record<string, unknown> }> } };
}

const termOf = (request: SearchRequest, field: string): unknown =>
  request.query.bool.filter.find(({ term }) => field in term)?.term[field];

/** Answers the head listing with `headTreeIds` and each version search with `versionsByTree`. */
const searchByType = (
  headTreeIds: string[],
  versionsByTree: Record<string, number[]> = {}
): jest.Mock =>
  jest.fn().mockImplementation(async (request: SearchRequest) => {
    if (termOf(request, 'type') === 'decision_tree') {
      return { hits: { hits: headTreeIds.map(headHit) } };
    }
    const treeId = String(termOf(request, 'attributes.tree_id'));
    const symptom = treeId.replace(/^symptom:/, '');
    return {
      hits: {
        hits: (versionsByTree[treeId] ?? []).map((version) => ({
          _id: `default:dtree_${symptom}_v${version}`,
          _source: { attributes: { version } },
          sort: [version],
        })),
      },
    };
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

describe('listDecisionTreeIds', () => {
  it('lists each head in the space once', async () => {
    const search = searchByType([TREE_ID, 'symptom:other', TREE_ID]);

    await expect(listDecisionTreeIds(client({ search }))).resolves.toEqual([
      TREE_ID,
      'symptom:other',
    ]);
    expect(search.mock.calls[0][0].query.bool.filter).toEqual([
      { term: { type: 'decision_tree' } },
      { term: { 'attributes.space_id': 'default' } },
    ]);
  });

  it('treats a missing index as no trees', async () => {
    const esClient = client({
      search: jest.fn().mockRejectedValue({
        statusCode: 404,
        meta: { body: { error: { type: 'index_not_found_exception' } } },
      }),
    });

    await expect(listDecisionTreeIds(esClient)).resolves.toEqual([]);
  });

  it('refuses a full page instead of returning a partial list', async () => {
    const search = searchByType(Array.from({ length: 500 }, (_, index) => `symptom:tree-${index}`));

    await expect(listDecisionTreeIds(client({ search }))).rejects.toThrow(/500 or more/);
  });
});

describe('snapshotDecisionTrees', () => {
  it('snapshots every head in the space plus the seeded tree', async () => {
    const esClient = client({
      get: jest
        .fn()
        .mockImplementation(async ({ id }: { id: string }) => ({ found: true, _source: { id } })),
      search: searchByType(['symptom:other'], { 'symptom:other': [1] }),
    });

    const snapshots = await snapshotDecisionTrees(esClient, [TREE_ID]);

    expect([...snapshots.keys()].sort()).toEqual(['symptom:other', TREE_ID].sort());
    expect(snapshots.get('symptom:other')?.map((doc) => doc.id)).toEqual([
      'default:dtree_other',
      'default:dtree_other_v1',
    ]);
    expect(snapshots.get(TREE_ID)?.map((doc) => doc.id)).toEqual([HEAD_ID]);
  });
});

describe('restoreDecisionTrees', () => {
  it('deletes a tree the replay created and puts a pre-existing tree back', async () => {
    const esClient = client({
      get: jest.fn().mockImplementation(async ({ id }: { id: string }) => ({
        found: true,
        _source: { content: `replay ${id}` },
      })),
      search: searchByType([TREE_ID, 'symptom:created'], { [TREE_ID]: [1, 2] }),
    });
    const snapshots = new Map([
      [TREE_ID, [{ id: `${HEAD_ID}_v1`, source: { content: 'original' } }]],
    ]);

    await restoreDecisionTrees(esClient, snapshots);

    expect(esClient.delete.mock.calls.map(([request]) => request.id)).toEqual([
      HEAD_ID,
      `${HEAD_ID}_v1`,
      `${HEAD_ID}_v2`,
      'default:dtree_created',
    ]);
    expect(esClient.index.mock.calls.map(([request]) => [request.id, request.document])).toEqual([
      [`${HEAD_ID}_v1`, { content: 'original' }],
    ]);
  });

  it('restores the snapshot when listing the current trees fails, then reports the failure', async () => {
    const search = jest
      .fn()
      .mockImplementation(async (request: SearchRequest) =>
        termOf(request, 'type') === 'decision_tree'
          ? Promise.reject({ statusCode: 503 })
          : searchPage([])
      );
    const esClient = client({ search });
    const snapshots = new Map([[TREE_ID, [{ id: HEAD_ID, source: { content: 'original' } }]]]);

    await expect(restoreDecisionTrees(esClient, snapshots)).rejects.toMatchObject({
      statusCode: 503,
    });
    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({ id: HEAD_ID, document: { content: 'original' } })
    );
  });

  it('keeps restoring after one tree fails and throws the first error', async () => {
    const failure = new Error('index failed');
    const index = jest.fn().mockRejectedValueOnce(failure).mockResolvedValue({});
    const esClient = client({ index, search: searchByType([]) });
    const snapshots = new Map([
      ['symptom:first', [{ id: 'default:dtree_first', source: {} }]],
      ['symptom:second', [{ id: 'default:dtree_second', source: {} }]],
    ]);

    await expect(restoreDecisionTrees(esClient, snapshots)).rejects.toBe(failure);
    expect(index.mock.calls.map(([request]) => request.id)).toEqual([
      'default:dtree_first',
      'default:dtree_second',
    ]);
  });
});
