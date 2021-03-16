/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { UMElasticsearchQueryFn } from '../adapters';
import { findIndexPatternById, getFieldByName } from './utils';
import { ESFilter } from '../../../../../typings/elasticsearch';

export interface FieldValueSuggestionParams {
  index: string;
  fieldName: string;
  fieldType: string;
  query: string;
  filters?: ESFilter[];
  useTimeRange?: boolean;
}

export const getFieldValueSuggestion: UMElasticsearchQueryFn<
  FieldValueSuggestionParams,
  any
> = async ({
  uptimeEsClient,
  index,
  fieldName,
  fieldType,
  query,
  filters: filtersQ,
  useTimeRange,
}) => {
  let fieldTypeT = fieldType;
  if (!fieldType) {
    const { fields = [] } = await findIndexPatternById(uptimeEsClient, index);

    const field = getFieldByName(fieldName, fields);

    fieldTypeT = field?.type!;
  }

  let filters = filtersQ;

  if (!filters || filters.length === 0 || useTimeRange) {
    filters = [];
    (filters ?? []).push({
      range: {
        '@timestamp': {
          gte: 'now-30m',
          lte: 'now',
        },
      },
    });
  }

  const body = await getBody({ fieldType: fieldTypeT, fieldName, query, filters });

  const result = await uptimeEsClient.baseESClient.search({ index, body });

  const buckets: any[] =
    get(result, 'body.aggregations.suggestions.buckets') ||
    get(result, 'body.aggregations.nestedSuggestions.suggestions.buckets');

  return { values: buckets };
};

async function getBody({
  fieldType,
  fieldName,
  query,
  filters,
}: {
  query: string;
  fieldType: string;
  fieldName: string;
  filters: ESFilter[];
}) {
  // https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-regexp-query.html#_standard_operators
  const getEscapedQuery = (q: string = '') =>
    q.replace(/[.?+*|{}[\]()"\\#@&<>~]/g, (match) => `\\${match}`);

  // Helps ensure that the regex is not evaluated eagerly against the terms dictionary
  const executionHint = 'map';

  return {
    size: 0,
    query: {
      bool: {
        filter: filters,
      },
    },
    aggs: {
      suggestions: {
        terms: {
          field: fieldName,
          ...(fieldType === 'string'
            ? {
                include: `${getEscapedQuery(query)}.*`,
              }
            : {}),
          ...(fieldType === 'number'
            ? {
                size: 100,
              }
            : {}),
          execution_hint: executionHint,
          shard_size: 10,
        },
      },
    },
  };
}
