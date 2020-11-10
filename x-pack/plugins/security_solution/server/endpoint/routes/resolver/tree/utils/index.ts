/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Represents a time range filter
 */
export interface Timerange {
  from: string;
  to: string;
}

/**
 * An array of unique IDs to identify nodes within the resolver tree.
 */
export type NodeID = string | number;

/**
 * The fields to use to identify nodes within a resolver tree.
 */
export interface Schema {
  /**
   * the ancestry field should be set to a field that contains an order array representing
   * the ancestors of a node.
   */
  ancestry?: string;
  /**
   * id represents the field to use as the unique ID for a node.
   */
  id: string;
  /**
   * parent represents the field that is the edge between two nodes.
   */
  parent: string;
}

/**
 * Returns the doc value fields filter to use in queries to limit the number of fields returned in the
 * query response.
 *
 * See for more info: https://www.elastic.co/guide/en/elasticsearch/reference/current/search-fields.html#docvalue-fields
 *
 * @param schema is the node schema information describing how relationships are formed between nodes
 *  in the resolver graph.
 */
export function docValueFields(schema: Schema): Array<{ field: string }> {
  const filter = [{ field: '@timestamp' }, { field: schema.id }, { field: schema.parent }];
  if (schema.ancestry) {
    filter.push({ field: schema.ancestry });
  }
  return filter;
}
