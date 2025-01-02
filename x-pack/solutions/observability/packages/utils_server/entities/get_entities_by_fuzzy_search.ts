/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray, orderBy } from 'lodash';
import Fuse from 'fuse.js';
import { ObservabilityElasticsearchClient } from '../es/client/create_observability_es_client';

export async function getEntitiesByFuzzySearch({
  esClient,
  entity,
  start,
  end,
  index,
}: {
  esClient: ObservabilityElasticsearchClient;
  entity: Record<string, string>;
  start: number;
  end: number;
  index: string | string[];
}): Promise<string[]> {
  if (Object.keys(entity).length > 1) {
    return [];
  }

  const [field, value] = Object.entries(entity)[0];

  const { terms } = await esClient.client.termsEnum({
    index: castArray(index).join(','),
    field,
    index_filter: {
      range: {
        '@timestamp': {
          gte: new Date(start).toISOString(),
          lte: new Date(end).toISOString(),
        },
      },
    },
    size: 10_000,
  });

  const results = new Fuse(terms, { includeScore: true, threshold: 0.75 }).search(value);

  return orderBy(results, (result) => result.score, 'asc')
    .slice(0, 5)
    .map((result) => result.item);
}
