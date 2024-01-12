/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { reject } from 'lodash';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { ESSearchResponse } from '@kbn/es-types';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

export function isUndefinedOrNull(value: any): value is undefined | null {
  return value === undefined || value === null;
}

interface TermQueryOpts {
  queryEmptyString: boolean;
}

export function termQuery<T extends string>(
  field: T,
  value: string | boolean | number | undefined | null,
  opts: TermQueryOpts = { queryEmptyString: true }
): QueryDslQueryContainer[] {
  if (isUndefinedOrNull(value) || (!opts.queryEmptyString && value === '')) {
    return [];
  }

  return [{ term: { [field]: value } }];
}

export function wildcardQuery<T extends string>(
  field: T,
  value: string | undefined,
  opts = { leadingWildcard: true }
): QueryDslQueryContainer[] {
  if (isUndefinedOrNull(value)) {
    return [];
  }

  return [
    {
      wildcard: {
        [field]: {
          value: opts.leadingWildcard ? `*${value}*` : `${value}*`,
          case_insensitive: true,
        },
      },
    },
  ];
}

export function termsQuery(
  field: string,
  ...values: Array<string | boolean | undefined | number | null>
): QueryDslQueryContainer[] {
  const filtered = reject(values, isUndefinedOrNull);

  if (!filtered.length) {
    return [];
  }

  return [{ terms: { [field]: filtered } }];
}

export function rangeQuery(
  start?: number,
  end?: number,
  field = '@timestamp'
): estypes.QueryDslQueryContainer[] {
  return [
    {
      range: {
        [field]: {
          gte: start,
          lte: end,
          format: 'epoch_millis',
        },
      },
    },
  ];
}

export function kqlQuery(kql?: string): estypes.QueryDslQueryContainer[] {
  if (!kql) {
    return [];
  }

  const ast = fromKueryExpression(kql);
  return [toElasticsearchQuery(ast)];
}

export async function typedSearch<
  DocumentSource extends unknown,
  TParams extends estypes.SearchRequest
>(
  esClient: ElasticsearchClient,
  params: TParams
): Promise<ESSearchResponse<DocumentSource, TParams>> {
  return (await esClient.search(params)) as unknown as ESSearchResponse<DocumentSource, TParams>;
}
