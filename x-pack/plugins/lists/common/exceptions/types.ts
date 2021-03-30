/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface BooleanFilter {
  bool: {
    must?: unknown | unknown[];
    must_not?: unknown | unknown[];
    should?: unknown[];
    filter?: unknown | unknown[];
    minimum_should_match?: number;
  };
}

export interface NestedFilter {
  nested: {
    path: string;
    query: unknown | unknown[];
    score_mode: string;
  };
}
