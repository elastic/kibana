/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from 'src/core/public';
import { WorkspaceField, ServerResultNode } from '../types';

const DEFAULT_SHARD_SIZE = 5000;

function createSamplerSearchBody(aggs: object, shardSize: number = DEFAULT_SHARD_SIZE) {
  return {
    size: 0,
    aggs: {
      sample: {
        sampler: {
          shard_size: shardSize,
        },
        aggs,
      },
    },
  };
}

function createTopTermsAggName(fieldName: string) {
  return `top_values_${fieldName}`;
}

function createTopTermsSubAgg(field: string, size: number = 10) {
  return {
    [createTopTermsAggName(field)]: {
      terms: {
        field,
        size,
      },
    },
  };
}

// TODO use elasticsearch types here
interface TopTermsAggResponse {
  aggregations?: {
    sample: Record<
      string,
      {
        buckets: Array<{ key: string; doc_count: number }>;
      }
    >;
  };
}

function getTopTermsResult(response: TopTermsAggResponse, fieldName: string) {
  if (!response.aggregations) {
    return [];
  }
  return response.aggregations.sample[createTopTermsAggName(fieldName)].buckets.map(
    (bucket) => bucket.key
  );
}

export function createServerResultNode(
  fieldName: string,
  term: string,
  allFields: WorkspaceField[]
): ServerResultNode {
  const field = allFields.find(({ name }) => name === fieldName);

  if (!field) {
    throw new Error('Invariant error: field not found');
  }

  return {
    field: fieldName,
    term,
    id: '',
    color: field.color,
    icon: field.icon,
    data: {
      field: fieldName,
      term,
    },
    label: term,
  };
}

export async function fetchTopNodes(
  post: CoreStart['http']['post'],
  index: string,
  fields: WorkspaceField[]
) {
  const aggs = fields
    .map(({ name }) => name)
    .map((fieldName) => createTopTermsSubAgg(fieldName))
    .reduce((allAggs, subAgg) => ({ ...allAggs, ...subAgg }));
  const body = createSamplerSearchBody(aggs);

  const response: TopTermsAggResponse = (
    await post('../api/graph/searchProxy', {
      body: JSON.stringify({ index, body }),
    })
  ).resp;

  const nodes: ServerResultNode[] = [];

  fields.forEach(({ name }) => {
    const topTerms = getTopTermsResult(response, name);
    const fieldNodes = topTerms.map((term) => createServerResultNode(name, term, fields));

    nodes.push(...fieldNodes);
  });

  return nodes;
}
