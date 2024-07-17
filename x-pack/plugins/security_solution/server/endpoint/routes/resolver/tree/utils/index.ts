/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ResolverSchema } from '../../../../../../common/endpoint/types';

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
 * Returns valid IDs that can be used in a search.
 *
 * @param ids array of ids
 */
export function validIDs(ids: NodeID[]): NodeID[] {
  return ids.filter((id) => String(id) !== '');
}

/**
 * Returns the resolver fields filter to use in queries to limit the number of fields returned in the
 * query response.
 * @param schema is the node schema information describing how relationships are formed between nodes
 *  in the resolver graph.
 */
export function resolverFields(schema: ResolverSchema): Array<{ field: string }> {
  const filter = [{ field: '@timestamp' }, { field: schema.id }, { field: schema.parent }];
  if (schema.ancestry) {
    filter.push({ field: schema.ancestry });
  }

  if (schema.name) {
    filter.push({ field: schema.name });
  }
  if (schema.agentId) {
    filter.push({ field: schema.agentId });
  }
  return filter;
}
