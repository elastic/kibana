/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import type { estypes } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  DECISION_TREE_AI_INDEX_DEST,
  MEMORY_INDEX,
  WIKI_AI_INDEX_DEST,
} from '@kbn/nightshift-investigations-plugin/common';

/** Each knowledge switch and the index its system stores everything in, in canonical order. */
export const KNOWLEDGE_INDICES = {
  memory: MEMORY_INDEX,
  wiki: WIKI_AI_INDEX_DEST,
  'decision-trees': DECISION_TREE_AI_INDEX_DEST,
} as const;

export type KnowledgeSystem = keyof typeof KNOWLEDGE_INDICES;

/** Pre-rename Wiki index (#303544); read as a fallback while source clusters still store pages there. */
export const LEGACY_WIKI_AI_INDEX_DEST = 'ai-index-idx-nightshift-cortex';

const SPACE_ID_FIELD = 'attributes.space_id';
const BULK_CHUNK_SIZE = 100;

/** `NIGHTSHIFT_KNOWLEDGE`, as the scout hook validated and exported it. */
export const selectedKnowledge = (value = process.env.NIGHTSHIFT_KNOWLEDGE): KnowledgeSystem[] => {
  const requested = new Set((value ?? '').split(',').map((each) => each.trim()));
  requested.delete('');
  const unknown = [...requested].filter((each) => !(each in KNOWLEDGE_INDICES));
  if (unknown.length > 0) {
    throw new Error(`Unknown NIGHTSHIFT_KNOWLEDGE systems: ${unknown.join(', ')}`);
  }
  return (Object.keys(KNOWLEDGE_INDICES) as KnowledgeSystem[]).filter((each) =>
    requested.has(each)
  );
};

/**
 * Moves a stored document into the eval's space: its id and `attributes.space_id` both name it.
 * Also rewrites pre-rename Cortex page ids (`cortex_<type>_<slug>`) and `'cortex'` tags to Wiki
 * (`wiki_<type>_<slug>` and `'wiki'`) so `createWikiPageStore` and `materializeWiki` read them.
 */
export const toTargetSpace = (
  hit: { _id: string; _source: Record<string, unknown> },
  sourceSpaceId: string,
  targetSpaceId: string
): { id: string; source: Record<string, unknown> } => {
  const prefix = `${sourceSpaceId}:`;
  const rawPageId = hit._id.startsWith(prefix) ? hit._id.slice(prefix.length) : hit._id;
  const pageId = rawPageId.startsWith('cortex_') ? `wiki_${rawPageId.slice(7)}` : rawPageId;
  const id =
    hit._id.startsWith(prefix) || rawPageId !== pageId ? `${targetSpaceId}:${pageId}` : hit._id;
  const attributes = (hit._source.attributes ?? {}) as Record<string, unknown>;
  const tags = Array.isArray(hit._source.tags)
    ? hit._source.tags.map((tag) => (tag === 'cortex' ? 'wiki' : tag))
    : undefined;
  return {
    id,
    source: {
      ...hit._source,
      ...(tags ? { tags } : {}),
      attributes: { ...attributes, space_id: targetSpaceId },
    },
  };
};

const inSpace = (spaceId: string): estypes.QueryDslQueryContainer => ({
  term: { [SPACE_ID_FIELD]: spaceId },
});

const isIndexNotFound = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'statusCode' in error &&
  (error as { statusCode?: number }).statusCode === 404;

const readSpace = async (source: Client, index: string, spaceId: string) => {
  const hits: Array<{ _id: string; _source: Record<string, unknown> }> = [];
  for await (const response of source.helpers.scrollSearch<Record<string, unknown>>({
    index,
    query: inSpace(spaceId),
    size: 500,
    // Embeddings are recomputed on write, by the eval cluster's own inference endpoint.
    _source_excludes: ['_inference_fields'],
  })) {
    for (const hit of response.body.hits.hits) {
      if (hit._id && hit._source) hits.push({ _id: hit._id, _source: hit._source });
    }
  }
  return hits;
};

const isArchived = (hit: { _source: Record<string, unknown> }): boolean =>
  (hit._source.attributes as { status?: unknown } | undefined)?.status === 'archived';

const readSystem = async (source: Client, system: KnowledgeSystem, spaceId: string) => {
  try {
    const hits = await readSpace(source, KNOWLEDGE_INDICES[system], spaceId);
    if (hits.length > 0 || system !== 'wiki') return hits;
  } catch (error) {
    if (system !== 'wiki' || !isIndexNotFound(error)) throw error;
  }
  return readSpace(source, LEGACY_WIKI_AI_INDEX_DEST, spaceId);
};

const writeAll = async (
  esClient: Client,
  index: string,
  docs: Array<{ id: string; source: Record<string, unknown> }>
) => {
  for (let start = 0; start < docs.length; start += BULK_CHUNK_SIZE) {
    const chunk = docs.slice(start, start + BULK_CHUNK_SIZE);
    const response = await esClient.bulk({
      operations: chunk.flatMap(({ id, source }) => [
        { index: { _index: index, _id: id } },
        source,
      ]),
    });
    const failed = response.items.find((item) => item.index?.error);
    if (failed) {
      throw new Error(
        `Restoring ${index} failed for ${failed.index?._id}: ${JSON.stringify(failed.index?.error)}`
      );
    }
  }
  await esClient.indices.refresh({ index });
};

/**
 * Replaces the eval space's knowledge with the source space's, for every selected system, before
 * the first example runs. Archived Wiki pages are left out. Returns what was loaded, for the
 * experiment's metadata.
 *
 * Known limitation: the dump is the source space's knowledge as it is now. It is not filtered
 * against the cases under test, so it can hold knowledge an earlier investigation of the same case
 * derived.
 */
export const restoreKnowledge = async ({
  esClient,
  log,
  systems = selectedKnowledge(),
  targetSpaceId = 'default',
  env = process.env,
  createSourceClient = (url, apiKey) => new Client({ node: url, auth: { apiKey } }),
}: {
  esClient: Client;
  log: ToolingLog;
  systems?: KnowledgeSystem[];
  targetSpaceId?: string;
  env?: NodeJS.ProcessEnv;
  createSourceClient?: (url: string, apiKey: string) => Client;
}): Promise<Record<string, string | number>> => {
  if (systems.length === 0) return { knowledge: 'none' };

  const { NIGHTSHIFT_KNOWLEDGE_ES_URL: url, NIGHTSHIFT_KNOWLEDGE_ES_API_KEY: apiKey } = env;
  const sourceSpaceId = env.NIGHTSHIFT_KNOWLEDGE_SPACE_ID || 'default';
  if (!url || !apiKey) {
    throw new Error(
      'NIGHTSHIFT_KNOWLEDGE requires NIGHTSHIFT_KNOWLEDGE_ES_URL and NIGHTSHIFT_KNOWLEDGE_ES_API_KEY'
    );
  }
  const source = createSourceClient(url, apiKey);
  const metadata: Record<string, string | number> = {
    knowledge: systems.join(','),
    knowledge_source: `${new URL(url).host}/${sourceSpaceId}`,
  };
  const dumps = new Map<KnowledgeSystem, Awaited<ReturnType<typeof readSpace>>>();
  try {
    for (const system of systems) {
      const hits = (await readSystem(source, system, sourceSpaceId)).filter(
        (hit) => system !== 'wiki' || !isArchived(hit)
      );
      if (hits.length === 0) {
        throw new Error(
          `The knowledge source has no ${system} documents in space ${sourceSpaceId}`
        );
      }
      dumps.set(system, hits);
    }
  } finally {
    await source.close();
  }

  // A reused Scout stack keeps the previous run's knowledge. Clear every system, not only the
  // selected ones: decision trees run the Wiki runtime, which must not read an earlier run's pages.
  for (const index of Object.values(KNOWLEDGE_INDICES)) {
    await esClient.deleteByQuery({
      index,
      query: inSpace(targetSpaceId),
      refresh: true,
      conflicts: 'proceed',
      ignore_unavailable: true,
    });
  }
  for (const [system, hits] of dumps) {
    await writeAll(
      esClient,
      KNOWLEDGE_INDICES[system],
      hits.map((hit) => toTargetSpace(hit, sourceSpaceId, targetSpaceId))
    );
    const newest = hits
      .map((hit) => String(hit._source['@timestamp'] ?? ''))
      .reduce((latest, each) => (each > latest ? each : latest), '');
    const key = `knowledge_${system.replace('-', '_')}`;
    metadata[`${key}_documents`] = hits.length;
    metadata[`${key}_newest`] = newest;
    log.info(
      `Restored ${hits.length} ${system} documents from ${metadata.knowledge_source} into space ${targetSpaceId} (newest ${newest})`
    );
  }
  return metadata;
};
