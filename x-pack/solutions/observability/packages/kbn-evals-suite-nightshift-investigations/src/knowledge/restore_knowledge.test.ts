/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import {
  formatKnowledgeExperimentName,
  KNOWLEDGE_INDICES,
  LEGACY_WIKI_AI_INDEX_DEST,
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

const legacyCortexHit = {
  _id: 'ops:cortex_service_autoops-api-gateway',
  _source: {
    '@timestamp': '2026-11-09T18:47:11.893Z',
    type: 'service',
    tags: ['cortex', 'service'],
    attributes: { space_id: 'ops', slug: 'autoops-api-gateway' },
  },
};

const createSource = (hitsByIndex: Record<string, unknown[]>, missingIndices: string[] = []) =>
  ({
    helpers: {
      async *scrollSearch({ index }: { index: string }) {
        if (missingIndices.includes(index)) {
          throw Object.assign(new Error(`no such index [${index}]`), {
            statusCode: 404,
            body: { error: { type: 'index_not_found_exception' } },
          });
        }
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
    expect(selectedKnowledge(' wiki,memory ')).toEqual(['memory', 'wiki']);
    expect(() => selectedKnowledge('cortex')).toThrow(
      'Unknown NIGHTSHIFT_KNOWLEDGE systems: cortex'
    );
  });
});

describe('formatKnowledgeExperimentName', () => {
  it('keeps the base name when knowledge is off and suffixes the selection when on', () => {
    expect(formatKnowledgeExperimentName('Nightshift graded investigation traces', 'none')).toBe(
      'Nightshift graded investigation traces'
    );
    expect(
      formatKnowledgeExperimentName('Nightshift graded investigation traces', 'memory,wiki')
    ).toBe('Nightshift graded investigation traces (knowledge: memory,wiki)');
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

  it('normalizes legacy cortex page ids and tags to wiki', () => {
    expect(toTargetSpace(legacyCortexHit, 'ops', 'default')).toEqual({
      id: 'default:wiki_service_autoops-api-gateway',
      source: {
        '@timestamp': '2026-11-09T18:47:11.893Z',
        type: 'service',
        tags: ['wiki', 'service'],
        attributes: { space_id: 'default', slug: 'autoops-api-gateway' },
      },
    });
  });
});

describe('restoreKnowledge', () => {
  it('clears every system in the eval space and skips the source when every switch is off', async () => {
    const esClient = createTarget();
    const createSourceClient = jest.fn();
    expect(
      await restoreKnowledge({ esClient, log, systems: [], env: ENV, createSourceClient })
    ).toEqual({ knowledge: 'none' });
    expect(createSourceClient).not.toHaveBeenCalled();
    expect(esClient.deleteByQuery.mock.calls.map(([params]) => params.index)).toEqual(
      Object.values(KNOWLEDGE_INDICES)
    );
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

  it('falls back to the pre-rename cortex index when the wiki index is missing or empty', async () => {
    const esClient = createTarget();
    const source = createSource({ [LEGACY_WIKI_AI_INDEX_DEST]: [legacyCortexHit] }, [
      KNOWLEDGE_INDICES.wiki,
    ]);

    const metadata = await restoreKnowledge({
      esClient,
      log,
      systems: ['wiki'],
      env: ENV,
      createSourceClient: () => source,
    });

    expect(esClient.bulk).toHaveBeenCalledTimes(1);
    expect(esClient.bulk.mock.calls[0][0].operations).toEqual([
      {
        index: {
          _index: KNOWLEDGE_INDICES.wiki,
          _id: 'default:wiki_service_autoops-api-gateway',
        },
      },
      toTargetSpace(legacyCortexHit, 'ops', 'default').source,
    ]);
    expect(metadata).toEqual({
      knowledge: 'wiki',
      knowledge_source: 'c0.example/ops',
      knowledge_wiki_documents: 1,
      knowledge_wiki_newest: '2026-11-09T18:47:11.893Z',
    });
  });

  it('fails before clearing anything when the source space has no documents, including when both wiki and legacy cortex indices are missing', async () => {
    const esClient = createTarget();
    await expect(
      restoreKnowledge({
        esClient,
        log,
        systems: ['wiki'],
        env: ENV,
        createSourceClient: () =>
          createSource({}, [KNOWLEDGE_INDICES.wiki, LEGACY_WIKI_AI_INDEX_DEST]),
      })
    ).rejects.toThrow('no wiki documents in space ops');
    expect(esClient.deleteByQuery).not.toHaveBeenCalled();
  });

  it('rethrows a 404 that is not an index_not_found_exception', async () => {
    const esClient = createTarget();
    const routeNotFound = Object.assign(new Error('Not Found'), {
      statusCode: 404,
      body: { error: { type: 'no_handler_found_exception' } },
    });
    const source = {
      helpers: {
        async *scrollSearch() {
          throw routeNotFound;
        },
      },
      close: jest.fn(),
    } as unknown as Client;

    await expect(
      restoreKnowledge({
        esClient,
        log,
        systems: ['wiki'],
        env: ENV,
        createSourceClient: () => source,
      })
    ).rejects.toThrow('Not Found');
    expect(esClient.deleteByQuery).not.toHaveBeenCalled();
  });

  it('scopes cleanup and restored document ids to a non-default targetSpaceId', async () => {
    const esClient = createTarget();
    const source = createSource({ [KNOWLEDGE_INDICES.memory]: [memoryHit] });

    await restoreKnowledge({
      esClient,
      log,
      systems: ['memory'],
      targetSpaceId: 'sre',
      env: ENV,
      createSourceClient: () => source,
    });

    for (const [params] of esClient.deleteByQuery.mock.calls) {
      expect(params.query).toEqual({ term: { 'attributes.space_id': 'sre' } });
    }
    expect(esClient.bulk.mock.calls[0][0].operations).toEqual([
      { index: { _index: KNOWLEDGE_INDICES.memory, _id: 'sre:memory_checkout-latency' } },
      toTargetSpace(memoryHit, 'ops', 'sre').source,
    ]);
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
