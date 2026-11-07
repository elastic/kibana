/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

interface StoredDocument {
  source: Record<string, unknown>;
  seqNo: number;
}

interface TermFilter {
  term: Record<string, unknown>;
}

const PRIMARY_TERM = 1;

const statusError = (statusCode: number, message: string): Error =>
  Object.assign(new Error(message), { statusCode });

const readPath = (source: Record<string, unknown>, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (value, key) =>
        typeof value === 'object' && value !== null
          ? (value as Record<string, unknown>)[key]
          : undefined,
      source
    );

/** `term` matches a scalar field exactly, or any element of an array field. */
const matchesTerm = (source: Record<string, unknown>, { term }: TermFilter): boolean =>
  Object.entries(term).every(([field, expected]) => {
    const actual = readPath(source, field);
    return Array.isArray(actual) ? actual.includes(expected) : actual === expected;
  });

const termFiltersOf = (query: unknown): TermFilter[] => {
  const filters = (query as { bool?: { filter?: unknown } } | undefined)?.bool?.filter;
  return Array.isArray(filters) ? (filters as TermFilter[]) : [];
};

/**
 * The few Elasticsearch calls `createCortexPageStore` makes, backed by a map. Running the real page
 * store on it keeps the replay's page semantics (ids, versions, provenance) identical to production
 * without an Elasticsearch cluster.
 */
export const createFakeEsClient = (): ElasticsearchClient => {
  const documents = new Map<string, StoredDocument>();
  let seqNo = 0;

  const keyOf = (index: string, id: string) => `${index}/${id}`;

  const write = (index: string, id: string, document: Record<string, unknown>) => {
    seqNo += 1;
    documents.set(keyOf(index, id), { source: document, seqNo });
    return { _id: id, _seq_no: seqNo, _primary_term: PRIMARY_TERM, result: 'created' };
  };

  const client = {
    search: async ({ index, query }: { index: string; query?: unknown }) => {
      const filters = termFiltersOf(query);
      const hits = [...documents.entries()]
        .filter(([key]) => key.startsWith(`${index}/`))
        .filter(([, { source }]) => filters.every((filter) => matchesTerm(source, filter)))
        .map(([key, { source }]) => ({ _id: key.slice(index.length + 1), _source: source }))
        .sort((left, right) =>
          String(right._source['@timestamp']).localeCompare(String(left._source['@timestamp']))
        );
      return { hits: { hits } };
    },

    get: async ({ index, id }: { index: string; id: string }) => {
      const stored = documents.get(keyOf(index, id));
      if (!stored) {
        throw statusError(404, `Document ${id} not found`);
      }
      return {
        found: true,
        _id: id,
        _source: stored.source,
        _seq_no: stored.seqNo,
        _primary_term: PRIMARY_TERM,
      };
    },

    index: async ({
      index,
      id,
      document,
      if_seq_no: ifSeqNo,
    }: {
      index: string;
      id: string;
      document: Record<string, unknown>;
      if_seq_no?: number;
    }) => {
      const existing = documents.get(keyOf(index, id));
      if (ifSeqNo !== undefined && existing?.seqNo !== ifSeqNo) {
        throw statusError(409, `Version conflict on ${id}`);
      }
      return write(index, id, document);
    },

    create: async ({
      index,
      id,
      document,
    }: {
      index: string;
      id: string;
      document: Record<string, unknown>;
    }) => {
      if (documents.has(keyOf(index, id))) {
        throw statusError(409, `Document ${id} already exists`);
      }
      return write(index, id, document);
    },

    delete: async ({ index, id }: { index: string; id: string }) => {
      documents.delete(keyOf(index, id));
      return { result: 'deleted' };
    },
  };

  // Only the calls above are implemented; anything else the store starts to use should fail
  // loudly rather than return undefined.
  return client as unknown as ElasticsearchClient;
};
