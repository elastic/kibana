/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ResolverSchema } from '../../../../../../common/endpoint/types';

/**
 * Represents a time range filter
 */
export interface TimeRange {
  from: string;
  to: string;
}

/**
 * An array of unique IDs to identify nodes within the resolver tree.
 */
export type NodeID = string | number;

/**
 * Returns the doc value fields filter to use in queries to limit the number of fields returned in the
 * query response.
 *
 * See for more info: https://www.elastic.co/guide/en/elasticsearch/reference/current/search-fields.html#docvalue-fields
 *
 * @param schema is the node schema information describing how relationships are formed between nodes
 *  in the resolver graph.
 */
export function docValueFields(schema: ResolverSchema): Array<{ field: string }> {
  const filter = [{ field: '@timestamp' }, { field: schema.id }, { field: schema.parent }];
  if (schema.ancestry) {
    filter.push({ field: schema.ancestry });
  }

  if (schema.name) {
    filter.push({ field: schema.name });
  }
  return filter;
}
