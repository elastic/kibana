/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import {
  KNOWLEDGE_INDICES,
  restoreKnowledge,
  selectedKnowledge,
  toTargetSpace,
} from './restore_knowledge';

const ENV = {
  NIGHTSHIFT_KNOWLEDGE_ES_URL: 'https://c0.example:443',
  NIGHTSHIFT_KNOWLEDGE_ES_API_KEY: 'key',
  NIGHTSHIFT_KNOWLEDGE_SPACE_ID: 'ops',
};

const memoryHit = {
  _id: 'ops:memory_checkout-latency',
  _source: { '@timestamp': '2026-11-01T00:00:00Z', attributes: { space_id: 'ops', slug: 'x' } },
};

const createSource = (hitsByIndex: Record<string, unknown[]>) =>
  ({
    helpers: {
      async *scrollSearch({ index }: { index: string }) {
        yield { body: { hits: { hits: hitsByIndex[index] ?? [] } } };
      },
    },
    close: jest.fn(),
  } as unknown as Client);

const createTarget = () =>
  ({
    deleteByQuery: jest.fn().mockResolvedValue({}),
    bulk: jest.fn().mockResolvedValue({ items: [{ index: { _id: 'x' } }] }),
    indices: { refresh: jest.fn().mockResolvedValue({}) },
  } as unknown as jest.Mocked<Client> & { indices: { refresh: jest.Mock } });

const log = new ToolingLog();

describe('selectedKnowledge', () => {
  it('returns the selection in canonical order and rejects unknown systems', () => {
    expect(selectedKnowledge(undefined)).toEqual([]);
    expect(selectedKnowledge(' cortex,memory ')).toEqual(['memory', 'cortex']);
    expect(() => selectedKnowledge('wiki')).toThrow('Unknown NIGHTSHIFT_KNOWLEDGE systems: wiki');
  });
});

describe('toTargetSpace', () => {
  it('rewrites the id prefix and space_id, keeping every other field', () => {
    expect(toTargetSpace(memoryHit, 'ops', 'default')).toEqual({
      id: 'default:memory_checkout-latency',
      source: {
        '@timestamp': '2026-11-01T00:00:00Z',
        attributes: { space_id: 'default', slug: 'x' },
      },
    });
  });
});

describe('restoreKnowledge', () => {
  it('touches nothing when every switch is off', async () => {
    const esClient = createTarget();
    const createSourceClient = jest.fn();
    expect(
      await restoreKnowledge({ esClient, log, systems: [], env: ENV, createSourceClient })
    ).toEqual({ knowledge: 'none' });
    expect(createSourceClient).not.toHaveBeenCalled();
    expect(esClient.deleteByQuery).not.toHaveBeenCalled();
  });

  it('clears every system in the eval space and writes only the selected ones', async () => {
    const esClient = createTarget();
    const source = createSource({ [KNOWLEDGE_INDICES.memory]: [memoryHit] });

    const metadata = await restoreKnowledge({
      esClient,
      log,
      systems: ['memory'],
      env: ENV,
      createSourceClient: () => source,
    });

    expect(esClient.deleteByQuery.mock.calls.map(([params]) => params.index)).toEqual(
      Object.values(KNOWLEDGE_INDICES)
    );
    expect(esClient.bulk).toHaveBeenCalledTimes(1);
    expect(esClient.bulk.mock.calls[0][0].operations).toEqual([
      { index: { _index: KNOWLEDGE_INDICES.memory, _id: 'default:memory_checkout-latency' } },
      toTargetSpace(memoryHit, 'ops', 'default').source,
    ]);
    expect(metadata).toEqual({
      knowledge: 'memory',
      knowledge_source: 'c0.example/ops',
      knowledge_memory_documents: 1,
      knowledge_memory_newest: '2026-11-01T00:00:00Z',
    });
    expect(source.close).toHaveBeenCalled();
  });

  it('fails before clearing anything when the source space has no documents', async () => {
    const esClient = createTarget();
    await expect(
      restoreKnowledge({
        esClient,
        log,
        systems: ['cortex'],
        env: ENV,
        createSourceClient: () => createSource({}),
      })
    ).rejects.toThrow('no cortex documents in space ops');
    expect(esClient.deleteByQuery).not.toHaveBeenCalled();
  });

  it('fails when a document is rejected on write', async () => {
    const esClient = createTarget();
    esClient.bulk.mockResolvedValue({
      errors: true,
      items: [{ index: { _id: 'default:x', error: { type: 'inference_exception' } } }],
    } as never);
    await expect(
      restoreKnowledge({
        esClient,
        log,
        systems: ['memory'],
        env: ENV,
        createSourceClient: () => createSource({ [KNOWLEDGE_INDICES.memory]: [memoryHit] }),
      })
    ).rejects.toThrow('inference_exception');
  });
});
