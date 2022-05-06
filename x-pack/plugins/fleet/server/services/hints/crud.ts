/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
// @ts-ignore
import flat from 'flat';

const flatten = flat.flatten as unknown as (o: any) => Record<string, string>;
import type { ListWithKuery } from '../../types';

import type { Hint, CreatePackagePolicyResult } from './types';
import { HINTS_INDEX_NAME } from './constants';

export const getHints = async (
  esClient: ElasticsearchClient,
  options: ListWithKuery
): Promise<Hint[]> => {
  const { page = 1, perPage = 20, sortField = 'received_at', sortOrder = 'desc', kuery } = options;
  const { hits } = await esClient.search({
    index: HINTS_INDEX_NAME,
    from: (page - 1) * perPage,
    size: perPage,
    sort: sortField + ':' + sortOrder,
  });

  if (!hits.hits.length) return [];

  return hits.hits.map(({ _source }) => {
    const hint = { ...(_source as any) };
    hint.annotations = flatten(hint.annotation);
    return hint as Hint;
  });
};

export const getNewHints = async (esClient: ElasticsearchClient): Promise<Hint[]> => {
  const { hits } = await esClient.search({
    index: HINTS_INDEX_NAME,
    query: {
      bool: {
        must_not: [
          {
            exists: {
              field: 'received_at',
            },
          },
        ],
      },
    },
  });

  if (!hits?.hits.length) return [];

  return hits.hits.map(({ _source, _id }) => {
    const hint = { ...(_source as any), _id };
    hint.annotations = flatten(hint.annotations);
    return hint as Hint;
  });

  return hints;
};

const updateSingleDoc = async (esClient: ElasticsearchClient, id: string, update: any) => {
  esClient.update({
    index: HINTS_INDEX_NAME,
    id,
    body: {
      doc: {
        ...update,
      },
    },
    refresh: 'wait_for',
    retry_on_conflict: 3,
  });
};

export const updateHintsById = async (
  esClient: ElasticsearchClient,
  hints: Hint[],
  update: any,
  logger?: Logger
) => {
  const ids = hints.map((h) => h._id);
  try {
    await Promise.all(ids.map((id) => updateSingleDoc(esClient, id, update)));
  } catch (e) {
    logger?.info(`Error updating hints ${ids} by id: ${e}`);
    throw e;
  }
};
export const setHintsAsReceived = (
  esClient: ElasticsearchClient,
  hints: Hint[],
  logger?: Logger
) => {
  const update = { received_at: Date.now(), last_updated: Date.now() };
  return updateHintsById(esClient, hints, update, logger);
};

export const setHintsAsComplete = (
  esClient: ElasticsearchClient,
  hintsIn: Hint[] | Hint,
  policies: CreatePackagePolicyResult[] = []
) => {
  const hints = Array.isArray(hintsIn) ? hintsIn : [hintsIn];
  const update = { status: 'complete', last_updated: Date.now() };
  if (!policies || policies.length !== hints.length) {
    return updateHintsById(esClient, hints, update);
  }

  return Promise.all(
    hints.map((hint, i) => {
      const policy = policies[i];
      const result = policy
        ? {
            package_policy_id: policy.id,
            agent_policy_id: policy.policy_id,
            package: { name: policy?.package?.name, version: policy?.package?.version },
          }
        : {};
      const updateWithResult = { ...update, result };
      return updateHintsById(esClient, [hint], updateWithResult);
    })
  );
};
