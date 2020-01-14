/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { merge, isArray } from 'lodash';

export interface TermBoolClause {
  term: { [field: string]: string | string[] };
}
export interface RangeBoolClause {
  range: {
    [field: string]: { lte: string | number } | { lt: string | number } | { gt: string | number };
  };
}
export interface ExistsBoolClause {
  exists: { field: string };
}

type BoolClauseFilters<T> = BoolClause<T> | PinnedQuery<T> | T;
export interface ShouldClause<T> {
  should: Array<BoolClauseFilters<T>>;
}
export interface MustClause<T> {
  must: Array<BoolClauseFilters<T>>;
}
export interface MustNotClause<T> {
  must_not: Array<BoolClauseFilters<T>>;
}
export interface FilterClause<T> {
  filter: Array<BoolClauseFilters<T>>;
}
export interface BoolClause<T> {
  bool: MustClause<T> | ShouldClause<T> | MustNotClause<T> | FilterClause<T>;
}

export interface BoolClauses<T> {
  bool: Partial<MustClause<T> & ShouldClause<T> & MustNotClause<T> & FilterClause<T>>;
}

export interface SortClause {
  _script: {
    type: string;
    order: string;
    script: {
      lang: string;
      source: string;
      params?: { [param: string]: string | string[] };
    };
  };
}
export type SortOptions = string | SortClause | Array<string | SortClause>;

export interface ScriptClause {
  source: string;
  lang: string;
  params: {
    [field: string]: string | number | Date;
  };
}

export interface UpdateByQuery<T> {
  query: PinnedQuery<T> | BoolClause<T> | BoolClauses<T>;
  sort: SortOptions;
  seq_no_primary_term: true;
  script: ScriptClause;
}

export interface PinnedQuery<T> {
  pinned: PinnedClause<T>;
}

export interface PinnedClause<T> {
  ids: string[];
  organic: BoolClause<T>;
}

export function mergeBoolClauses<T>(...clauses: Array<BoolClause<T>>): BoolClauses<T> {
  return merge({}, ...clauses, function(
    existingBoolClause: Array<BoolClauseFilters<T>>,
    boolClauseOfSameType: Array<BoolClauseFilters<T>>
  ) {
    // If we have two bool clauses of same type (FOR EXAMPLE
    // two `must` clauses, we merge them, into one)
    if (isArray(existingBoolClause)) {
      return existingBoolClause.concat(boolClauseOfSameType);
    }
    // otherwise dont return anything and the default behaviour
    // merges this clause into the final object
  });
}

export function shouldBeOneOf<T>(
  ...should: Array<BoolClauseFilters<T>>
): {
  bool: ShouldClause<T>;
} {
  return {
    bool: {
      should,
    },
  };
}

export function mustBeAllOf<T>(
  ...must: Array<BoolClauseFilters<T>>
): {
  bool: MustClause<T>;
} {
  return {
    bool: {
      must,
    },
  };
}

export function filterDownBy<T>(
  ...filter: Array<BoolClauseFilters<T>>
): {
  bool: FilterClause<T>;
} {
  return {
    bool: {
      filter,
    },
  };
}

export function asPinnedQuery<T>(
  ids: PinnedClause<T>['ids'],
  organic: PinnedClause<T>['organic']
): PinnedQuery<T> {
  return {
    pinned: {
      ids,
      organic,
    },
  };
}

export function asUpdateByQuery<T>({
  query,
  update,
  sort,
}: {
  query: UpdateByQuery<T>['query'];
  update: UpdateByQuery<T>['script'];
  sort: UpdateByQuery<T>['sort'];
}): UpdateByQuery<T> {
  return {
    query,
    sort,
    seq_no_primary_term: true,
    script: update,
  };
}
