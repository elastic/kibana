/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';

export interface MustCondition {
  bool: Pick<estypes.BoolQuery, 'must'>;
}
export interface MustNotCondition {
  bool: Pick<estypes.BoolQuery, 'must_not'>;
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
  lang: string;
  params?: {
    [field: string]:
      | string
      | number
      | Date
      | string[]
      | { [field: string]: string | number | Date };
  };
}

export type PinnedQuery = Pick<estypes.QueryContainer, 'pinned'>;

type BoolClause = Pick<estypes.QueryContainer, 'bool'>;
export function matchesClauses(...clauses: BoolClause[]): BoolClause {
  return {
    bool: Object.assign({}, ...clauses.map((clause) => clause.bool)),
  };
}

export function shouldBeOneOf(...should: estypes.QueryContainer[]) {
  return {
    bool: {
      should,
    },
  };
}

export function mustBeAllOf(...must: estypes.QueryContainer[]) {
  return {
    bool: {
      must,
    },
  };
}

export function filterDownBy(...filter: estypes.QueryContainer[]) {
  return {
    bool: {
      filter,
    },
  };
}

export function asPinnedQuery(
  ids: estypes.PinnedQuery['ids'],
  organic: estypes.PinnedQuery['organic']
): Pick<estypes.QueryContainer, 'pinned'> {
  return {
    pinned: {
      ids,
      organic,
    },
  };
}
