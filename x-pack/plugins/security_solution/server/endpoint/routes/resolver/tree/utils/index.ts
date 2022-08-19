/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
