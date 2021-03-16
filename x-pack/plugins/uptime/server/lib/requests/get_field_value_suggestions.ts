/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { UMElasticsearchQueryFn } from '../adapters';
import { findIndexPatternById, getFieldByName } from './utils';
import { Filter, IFieldType } from '../../../../../../src/plugins/data/common';

export interface FieldValueSuggestionParams {
  index: string;
  fieldName: string;
  query: string;
  filters?: Filter[];
}

export const getFieldValueSuggestion: UMElasticsearchQueryFn<
  FieldValueSuggestionParams,
  any
> = async ({ uptimeEsClient, index, fieldName, query, filters }) => {
  const indexPattern = await findIndexPatternById(uptimeEsClient.getSavedObjectsClient()!, index);

  const field = indexPattern && getFieldByName(fieldName, indexPattern);
  const body = await getBody(field || fieldName, query, filters);

  const result = await uptimeEsClient.baseESClient.search({ index, body });

  const buckets: any[] =
    get(result, 'body.aggregations.suggestions.buckets') ||
    get(result, 'body.aggregations.nestedSuggestions.suggestions.buckets');

  return buckets;
};

async function getBody(field: IFieldType | string, query: string, filters: Filter[] = []) {
  const isFieldObject = (f: any): f is IFieldType => Boolean(f && f.name);

  // https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-regexp-query.html#_standard_operators
  const getEscapedQuery = (q: string = '') =>
    q.replace(/[.?+*|{}[\]()"\\#@&<>~]/g, (match) => `\\${match}`);

  // Helps ensure that the regex is not evaluated eagerly against the terms dictionary
  const executionHint = 'map';

  const body = {
    size: 0,
    query: {
      bool: {
        filter: [
          {
            range: {
              '@timestamp': {
                gte: 'now-15m',
                lte: 'now',
              },
            },
          },
        ],
      },
    },
    aggs: {
      suggestions: {
        terms: {
          field: isFieldObject(field) ? field.name : field,
          include: `${getEscapedQuery(query)}.*`,
          execution_hint: executionHint,
        },
      },
    },
  };

  if (isFieldObject(field) && field.subType && field.subType.nested) {
    return {
      ...body,
      aggs: {
        nestedSuggestions: {
          nested: {
            path: field.subType.nested.path,
          },
          aggs: body.aggs,
        },
      },
    };
  }

  return body;
}
