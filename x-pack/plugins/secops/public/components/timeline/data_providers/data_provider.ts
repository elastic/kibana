/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/** Represents the Timeline data providers */
export interface DataProvider {
  /** Uniquely identifies a data provider */
  id: string;
  /** Human readable */
  name: string;
  /**
   * When `false`, a data provider is temporarily disabled, but not removed from
   * the timeline. default: `true`
   */
  enabled: boolean;
  /**
   * Returns a query properties that, when executed, returns the data for this provider
   */
  queryMatch: string;
  queryDate?: string;
  /**
   * When `true`, boolean logic is applied to the data provider to negate it.
   * default: `false`
   */
  negated: boolean;

  /**
   * Additional query clauses that are ANDed with this query to narrow results
   */
  and: DataProvider[];
}
