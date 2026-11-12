/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import {
  listDecisionTreeIds,
  listDecisionTreeIdsForConversation,
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
  query: {
    bool: {
      filter: Array<{ term?: Record<string, unknown>; terms?: Record<string, unknown[]> }>;
    };
  };
}

const termOf = (request: SearchRequest, field: string): unknown =>
  request.query.bool.filter.find(({ term }) => term && field in term)?.term?.[field];

const CONVERSATION_ID = 'nightshift-reinforcement-replay-case-1';

/**
 * Answers the head listing with `headTreeIds`, the conversation provenance search with
 * `stampedTreeIds`, and each version search with `versionsByTree`.
 */
const searchByType = (
  headTreeIds: string[],
  versionsByTree: Record<string, number[]> = {},
  stampedTreeIds: string[] = [],
  countedTreeIds: string[] = []
): jest.Mock =>
  jest.fn().mockImplementation(async (request: SearchRequest) => {
    if (termOf(request, 'attributes.conversation_id') === CONVERSATION_ID) {
      return { hits: { hits: stampedTreeIds.map(headHit) } };
    }
    if (termOf(request, 'attributes.counts_conversation_id') === CONVERSATION_ID) {
      return { hits: { hits: countedTreeIds.map(headHit) } };
    }
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

  it('waits for each delete to be searchable when there is nothing to put back', async () => {
    const esClient = client({
      get: jest.fn().mockResolvedValue({ found: true, _source: { content: 'replay head' } }),
      search: jest.fn().mockResolvedValue(searchPage([1])),
    });

    await restoreDecisionTree(esClient, TREE_ID, []);

    expect(esClient.delete.mock.calls.map(([request]) => [request.id, request.refresh])).toEqual([
      [HEAD_ID, 'wait_for'],
      [`${HEAD_ID}_v1`, 'wait_for'],
    ]);
    expect(esClient.index).not.toHaveBeenCalled();
  });

  it('ignores a document that is already gone', async () => {
    const esClient = client({
      get: jest.fn().mockResolvedValue({ found: true, _source: { content: 'replay head' } }),
      delete: jest
        .fn()
        .mockRejectedValueOnce({ meta: { statusCode: 404, body: { result: 'not_found' } } })
        .mockResolvedValue({}),
      search: jest.fn().mockResolvedValue(searchPage([1])),
    });
    const snapshot = [{ id: HEAD_ID, source: { content: 'original' } }];

    await restoreDecisionTree(esClient, TREE_ID, snapshot);

    expect(esClient.delete).toHaveBeenCalledTimes(2);
    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({ id: HEAD_ID, document: { content: 'original' } })
    );
  });

  it('fails when a delete fails for a reason other than a missing document', async () => {
    const forbidden = {
      statusCode: 403,
      meta: { body: { error: { type: 'security_exception' } } },
    };
    const esClient = client({
      get: jest.fn().mockResolvedValue({ found: true, _source: { content: 'replay head' } }),
      delete: jest.fn().mockRejectedValue(forbidden),
    });

    await expect(
      restoreDecisionTree(esClient, TREE_ID, [{ id: HEAD_ID, source: { content: 'original' } }])
    ).rejects.toBe(forbidden);
  });

  it('re-indexes the snapshot head after a failed version delete, then throws it', async () => {
    const unavailable = { statusCode: 503 };
    const esClient = client({
      get: jest.fn().mockResolvedValue({ found: true, _source: { content: 'replay head' } }),
      search: jest.fn().mockResolvedValue(searchPage([1, 2])),
      delete: jest
        .fn()
        .mockImplementation(async ({ id }: { id: string }) =>
          id === `${HEAD_ID}_v1` ? Promise.reject(unavailable) : {}
        ),
    });

    await expect(
      restoreDecisionTree(esClient, TREE_ID, [{ id: HEAD_ID, source: { content: 'original' } }])
    ).rejects.toBe(unavailable);
    expect(esClient.delete.mock.calls.map(([request]) => request.id)).toEqual([
      HEAD_ID,
      `${HEAD_ID}_v1`,
      `${HEAD_ID}_v2`,
    ]);
    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({ id: HEAD_ID, document: { content: 'original' } })
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

describe('listDecisionTreeIdsForConversation', () => {
  it('lists each tree whose head or version carries the conversation id', async () => {
    const search = searchByType([], {}, [TREE_ID, 'symptom:other', TREE_ID]);

    await expect(
      listDecisionTreeIdsForConversation(client({ search }), CONVERSATION_ID)
    ).resolves.toEqual([TREE_ID, 'symptom:other']);
    expect(search.mock.calls[0][0].query.bool.filter).toEqual([
      { terms: { type: ['decision_tree', 'decision_tree_version'] } },
      { term: { 'attributes.conversation_id': CONVERSATION_ID } },
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

    await expect(listDecisionTreeIdsForConversation(esClient, CONVERSATION_ID)).resolves.toEqual(
      []
    );
  });
});

describe('listDecisionTreeIdsForConversation counts writes', () => {
  it('includes a tree whose last counts-only write the conversation made', async () => {
    const esClient = client({
      search: searchByType(['symptom:other'], {}, ['symptom:stamped'], ['symptom:counted']),
    });

    await expect(listDecisionTreeIdsForConversation(esClient, CONVERSATION_ID)).resolves.toEqual([
      'symptom:stamped',
      'symptom:counted',
    ]);
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
  const replayHead = () =>
    jest.fn().mockImplementation(async ({ id }: { id: string }) => ({
      found: true,
      _source: { content: `replay ${id}` },
    }));

  it('rolls back only the trees the replay owns', async () => {
    const esClient = client({
      get: replayHead(),
      search: searchByType(
        [TREE_ID, 'symptom:stamped', 'symptom:foreign', 'symptom:untouched'],
        { [TREE_ID]: [1, 2] },
        ['symptom:stamped']
      ),
    });
    const snapshots = new Map([
      [TREE_ID, [{ id: `${HEAD_ID}_v1`, source: { content: 'original' } }]],
      ['symptom:untouched', [{ id: 'default:dtree_untouched', source: { content: 'untouched' } }]],
    ]);

    await restoreDecisionTrees(esClient, snapshots, {
      treeIds: [TREE_ID],
      conversationId: CONVERSATION_ID,
    });

    // The seeded tree is put back and the tree committed under the replay's conversation, absent
    // before it, is deleted. A tree another investigation created, and one that was in the
    // snapshot but not owned, are never touched.
    expect(esClient.delete.mock.calls.map(([request]) => request.id)).toEqual([
      HEAD_ID,
      `${HEAD_ID}_v1`,
      `${HEAD_ID}_v2`,
      'default:dtree_stamped',
    ]);
    expect(esClient.index.mock.calls.map(([request]) => [request.id, request.document])).toEqual([
      [`${HEAD_ID}_v1`, { content: 'original' }],
    ]);
  });

  it('puts back a pre-existing tree found only through conversation provenance', async () => {
    const esClient = client({
      get: replayHead(),
      search: searchByType(['symptom:stamped'], {}, ['symptom:stamped']),
    });
    const snapshots = new Map([
      ['symptom:stamped', [{ id: 'default:dtree_stamped', source: { content: 'original' } }]],
    ]);

    await restoreDecisionTrees(esClient, snapshots, {
      treeIds: [],
      conversationId: CONVERSATION_ID,
    });

    expect(esClient.delete.mock.calls.map(([request]) => request.id)).toEqual([
      'default:dtree_stamped',
    ]);
    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'default:dtree_stamped', document: { content: 'original' } })
    );
  });

  it('restores the named trees when the provenance search fails, then reports the failure', async () => {
    const search = jest
      .fn()
      .mockImplementation(async (request: SearchRequest) =>
        termOf(request, 'attributes.conversation_id') === CONVERSATION_ID
          ? Promise.reject({ statusCode: 503 })
          : searchPage([])
      );
    const esClient = client({ search });
    const snapshots = new Map([[TREE_ID, [{ id: HEAD_ID, source: { content: 'original' } }]]]);

    await expect(
      restoreDecisionTrees(esClient, snapshots, {
        treeIds: [TREE_ID],
        conversationId: CONVERSATION_ID,
      })
    ).rejects.toMatchObject({ statusCode: 503 });
    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({ id: HEAD_ID, document: { content: 'original' } })
    );
  });

  it('still restores a submitted tree the replay stamped when the provenance search fails', async () => {
    const search = jest
      .fn()
      .mockImplementation(async (request: SearchRequest) =>
        termOf(request, 'attributes.conversation_id') === CONVERSATION_ID
          ? Promise.reject({ statusCode: 503 })
          : searchPage([])
      );
    const get = jest.fn().mockImplementation(async ({ id }: { id: string }) => ({
      found: true,
      _source: {
        attributes: {
          conversation_id: id === 'default:dtree_stamped' ? CONVERSATION_ID : 'other-investigation',
        },
      },
    }));
    const esClient = client({ get, search });
    const snapshots = new Map([
      ['symptom:stamped', [{ id: 'default:dtree_stamped', source: { content: 'original' } }]],
      ['symptom:foreign', [{ id: 'default:dtree_foreign', source: { content: 'original' } }]],
    ]);

    await expect(
      restoreDecisionTrees(esClient, snapshots, {
        treeIds: [],
        candidateIds: ['symptom:stamped', 'symptom:foreign'],
        conversationId: CONVERSATION_ID,
      })
    ).rejects.toMatchObject({ statusCode: 503 });
    expect(esClient.index.mock.calls.map(([request]) => request.id)).toEqual([
      'default:dtree_stamped',
    ]);
  });

  it('keeps restoring after one tree fails and throws the first error', async () => {
    const failure = new Error('index failed');
    const index = jest.fn().mockRejectedValueOnce(failure).mockResolvedValue({});
    const esClient = client({ index, search: searchByType([]) });
    const snapshots = new Map([
      ['symptom:first', [{ id: 'default:dtree_first', source: {} }]],
      ['symptom:second', [{ id: 'default:dtree_second', source: {} }]],
    ]);

    await expect(
      restoreDecisionTrees(esClient, snapshots, {
        treeIds: ['symptom:first', 'symptom:second'],
        conversationId: CONVERSATION_ID,
      })
    ).rejects.toBe(failure);
    expect(index.mock.calls.map(([request]) => request.id)).toEqual([
      'default:dtree_first',
      'default:dtree_second',
    ]);
  });

  it('keeps restoring after a failed delete and throws it at the end', async () => {
    const failure = { statusCode: 503 };
    const esClient = client({
      get: replayHead(),
      delete: jest.fn().mockRejectedValueOnce(failure).mockResolvedValue({}),
      search: searchByType([]),
    });
    const snapshots = new Map([
      ['symptom:first', [{ id: 'default:dtree_first', source: {} }]],
      ['symptom:second', [{ id: 'default:dtree_second', source: {} }]],
    ]);

    await expect(
      restoreDecisionTrees(esClient, snapshots, {
        treeIds: ['symptom:first', 'symptom:second'],
        conversationId: CONVERSATION_ID,
      })
    ).rejects.toBe(failure);
    expect(esClient.index.mock.calls.map(([request]) => request.id)).toEqual([
      'default:dtree_first',
      'default:dtree_second',
    ]);
  });
});
