/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Terminology
 * ===========
 * The terms for the differenct clauses in an Elasticsearch query can be confusing, here are some
 * clarifications that might help you understand the Typescript types we use here.
 *
 * Given the following Query:
 * {
 *   "query": { (1)
 *      "bool": { (2)
 *        "must":
 *          [
 * (3)        { "term" : { "tag" : "wow" } },
 *            { "term" : { "tag" : "elasticsearch" } },
 *            {
 *              "must" : { "term" : { "user" : "kimchy" } }
 *            }
 *          ]
 *       }
 *    }
 * }
 *
 * These are referred to as:
 *  (1). BoolClause / BoolClauseWithAnyCondition
 *  (2). BoolCondition / AnyBoolCondition
 *  (3). BoolClauseFilter
 *
 */

export interface TermFilter {
  term: { [field: string]: string | string[] };
}
export interface RangeFilter {
  range: {
    [field: string]: { lte: string | number } | { lt: string | number } | { gt: string | number };
  };
}
export interface ExistsFilter {
  exists: { field: string };
}

type BoolClauseFilter = TermFilter | RangeFilter | ExistsFilter;
type BoolClauseFiltering<T extends BoolClauseFilter> =
  | BoolClauseWithAnyCondition<T>
  | PinnedQuery<T>
  | T;

enum Conditions {
  Should = 'should',
  Must = 'must',
  MustNot = 'must_not',
  Filter = 'filter',
}

/**
 * Describe a specific BoolClause Condition with a BoolClauseFilter on it, such as:
 * ```
 * {
 *  must : [
 *    T, ...
 *  ]
 * }
 * ```
 */
type BoolCondition<C extends Conditions, T extends BoolClauseFilter> = {
  [c in C]: Array<BoolClauseFiltering<T>>;
};

/**
 * Describe a Bool clause with a specific Condition, such as:
 * ```
 * {
 *  // described by BoolClause
 *  bool: {
 *    // described by BoolCondition
 *    must: [
 *      T, ...
 *    ]
 *  }
 * }
 * ```
 */
interface BoolClause<C extends Conditions, T extends BoolClauseFilter> {
  bool: BoolCondition<C, T>;
}

/**
 * Describe a Bool clause with mixed Conditions, such as:
 * ```
 * {
 *  // described by BoolClause<...>
 *  bool: {
 *    // described by BoolCondition<Conditions.Must, ...>
 *    must : {
 *      ...
 *    },
 *    // described by BoolCondition<Conditions.Should, ...>
 *    should : {
 *      ...
 *    }
 *  }
 * }
 * ```
 */
type AnyBoolCondition<T extends BoolClauseFilter> = {
  [Condition in Conditions]?: Array<BoolClauseFiltering<T>>;
};

/**
 * Describe a Bool Condition with any Condition on it, so it can handle both:
 * ```
 * {
 *  bool: {
 *    must : {
 *      ...
 *    }
 *  }
 * }
 * ```
 *
 * and:
 *
 * ```
 * {
 *  bool: {
 *    must_not : {
 *      ...
 *    }
 *  }
 * }
 * ```
 */
export interface BoolClauseWithAnyCondition<T extends BoolClauseFilter> {
  bool: AnyBoolCondition<T>;
}

/**
 * Describe the various Bool Clause Conditions we support, as specified in the Conditions enum
 */
export type ShouldCondition<T extends BoolClauseFilter> = BoolClause<Conditions.Should, T>;
export type MustCondition<T extends BoolClauseFilter> = BoolClause<Conditions.Must, T>;
export type MustNotCondition<T extends BoolClauseFilter> = BoolClause<Conditions.MustNot, T>;
export type FilterCondition<T extends BoolClauseFilter> = BoolClause<Conditions.Filter, T>;

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

export interface UpdateByQuery<T extends BoolClauseFilter> {
  query: PinnedQuery<T> | BoolClauseWithAnyCondition<T>;
  sort: SortOptions;
  seq_no_primary_term: true;
  script: ScriptClause;
}

export interface PinnedQuery<T extends BoolClauseFilter> {
  pinned: PinnedClause<T>;
}

export interface PinnedClause<T extends BoolClauseFilter> {
  ids: string[];
  organic: BoolClauseWithAnyCondition<T>;
}

export function matchesClauses<T extends BoolClauseFilter>(
  ...clauses: Array<BoolClauseWithAnyCondition<T>>
): BoolClauseWithAnyCondition<T> {
  return {
    bool: Object.assign({}, ...clauses.map((clause) => clause.bool)),
  };
}

export function shouldBeOneOf<T extends BoolClauseFilter>(
  ...should: Array<BoolClauseFiltering<T>>
): ShouldCondition<T> {
  return {
    bool: {
      should,
    },
  };
}

export function mustBeAllOf<T extends BoolClauseFilter>(
  ...must: Array<BoolClauseFiltering<T>>
): MustCondition<T> {
  return {
    bool: {
      must,
    },
  };
}

export function filterDownBy<T extends BoolClauseFilter>(
  ...filter: Array<BoolClauseFiltering<T>>
): FilterCondition<T> {
  return {
    bool: {
      filter,
    },
  };
}

export function asPinnedQuery<T extends BoolClauseFilter>(
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

export function asUpdateByQuery<T extends BoolClauseFilter>({
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
