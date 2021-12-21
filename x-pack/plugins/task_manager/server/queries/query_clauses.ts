/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export interface MustCondition {
  bool: Pick<estypes.QueryDslBoolQuery, 'must'>;
}
export interface MustNotCondition {
  bool: Pick<estypes.QueryDslBoolQuery, 'must_not'>;
}

export interface ScriptBasedSortClause {
  _script: {
    type: string;
    order: string;
    script: ScriptClause;
  };
}

export interface ScriptClause {
  source: string;
  lang: estypes.ScriptLanguage;
  params?: {
    [field: string]:
      | string
      | number
      | Date
      | string[]
      | { [field: string]: string | number | Date };
  };
}

export type PinnedQuery = Pick<estypes.QueryDslQueryContainer, 'pinned'>;

type BoolClause = Pick<estypes.QueryDslQueryContainer, 'bool'>;
export function matchesClauses(...clauses: BoolClause[]): BoolClause {
  return {
    bool: Object.assign({}, ...clauses.map((clause) => clause.bool)),
  };
}

export function shouldBeOneOf(...should: estypes.QueryDslQueryContainer[]) {
  return {
    bool: {
      should,
    },
  };
}

export function mustBeAllOf(...must: estypes.QueryDslQueryContainer[]) {
  return {
    bool: {
      must,
    },
  };
}

export function filterDownBy(...filter: estypes.QueryDslQueryContainer[]) {
  return {
    bool: {
      filter,
    },
  };
}

export function asPinnedQuery(
  ids: estypes.QueryDslPinnedQuery['ids'],
  organic: estypes.QueryDslPinnedQuery['organic']
): Pick<estypes.QueryDslQueryContainer, 'pinned'> {
  return {
    pinned: {
      ids,
      organic,
    },
  };
}
