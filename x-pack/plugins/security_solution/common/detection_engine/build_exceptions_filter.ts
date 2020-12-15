/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { chunk } from 'lodash/fp';

import { Filter } from '../../../../../src/plugins/data/common';
import {
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
  EntryMatch,
  EntryMatchAny,
  EntryNested,
  entriesMatch,
  entriesMatchAny,
  entriesExists,
  entriesNested,
  EntryExists,
} from '../../../lists/common';
import { BooleanFilter, NestedFilter } from './types';
import { hasLargeValueList } from './utils';

type NonListEntry = EntryMatch | EntryMatchAny | EntryNested | EntryExists;
interface ExceptionListItemNonLargeList extends ExceptionListItemSchema {
  entries: NonListEntry[];
}

interface CreateExceptionListItemNonLargeList extends CreateExceptionListItemSchema {
  entries: NonListEntry[];
}

export type ExceptionItemSansLargeValueLists =
  | ExceptionListItemNonLargeList
  | CreateExceptionListItemNonLargeList;

export const chunkExceptions = (
  exceptions: ExceptionItemSansLargeValueLists[],
  chunkSize: number
): ExceptionItemSansLargeValueLists[][] => {
  return chunk(chunkSize, exceptions);
};

export const buildExceptionItemFilter = (
  exceptionItem: ExceptionItemSansLargeValueLists
): BooleanFilter | NestedFilter => {
  const { entries } = exceptionItem;

  if (entries.length === 1) {
    return createInnerAndClauses(entries[0]);
  } else {
    return {
      bool: {
        filter: entries.map((entry) => createInnerAndClauses(entry)),
      },
    };
  }
};

export const createOrClauses = (
  exceptionItems: ExceptionItemSansLargeValueLists[]
): Array<BooleanFilter | NestedFilter> => {
  return exceptionItems.map((exceptionItem) => buildExceptionItemFilter(exceptionItem));
};

export const buildExceptionFilter = ({
  lists,
  excludeExceptions,
  chunkSize,
}: {
  lists: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>;
  excludeExceptions: boolean;
  chunkSize: number;
}): Filter | undefined => {
  // Remove exception items with large value lists. These are evaluated
  // elsewhere for the moment being.
  const exceptionsWithoutLargeValueLists = lists.filter(
    (item): item is ExceptionItemSansLargeValueLists => !hasLargeValueList(item.entries)
  );

  const exceptionFilter: Filter = {
    meta: {
      alias: null,
      negate: excludeExceptions,
      disabled: false,
    },
    query: {
      bool: {
        should: undefined,
      },
    },
  };

  if (exceptionsWithoutLargeValueLists.length === 0) {
    return undefined;
  } else if (exceptionsWithoutLargeValueLists.length <= chunkSize) {
    const clause = createOrClauses(exceptionsWithoutLargeValueLists);
    exceptionFilter.query.bool.should = clause;
    return exceptionFilter;
  } else {
    const chunks = chunkExceptions(exceptionsWithoutLargeValueLists, chunkSize);

    const filters = chunks.map<Filter>((exceptionsChunk) => {
      const orClauses = createOrClauses(exceptionsChunk);

      return {
        meta: {
          alias: null,
          negate: false,
          disabled: false,
        },
        query: {
          bool: {
            should: orClauses,
          },
        },
      };
    });

    const clauses = filters.map<BooleanFilter>(({ query }) => query);

    return {
      meta: {
        alias: null,
        negate: excludeExceptions,
        disabled: false,
      },
      query: {
        bool: {
          should: clauses,
        },
      },
    };
  }
};

export const buildExclusionClause = (booleanFilter: BooleanFilter): BooleanFilter => {
  return {
    bool: {
      must_not: booleanFilter,
    },
  };
};

export const buildMatchClause = (entry: EntryMatch): BooleanFilter => {
  const { field, operator, value } = entry;
  const matchClause = {
    bool: {
      should: [
        {
          match_phrase: {
            [field]: value,
          },
        },
      ],
      minimum_should_match: 1,
    },
  };

  if (operator === 'excluded') {
    return buildExclusionClause(matchClause);
  } else {
    return matchClause;
  }
};

export const getBaseMatchAnyClause = (entry: EntryMatchAny): BooleanFilter => {
  const { field, value } = entry;

  if (value.length === 1) {
    return {
      bool: {
        should: [
          {
            match_phrase: {
              [field]: value[0],
            },
          },
        ],
        minimum_should_match: 1,
      },
    };
  }

  return {
    bool: {
      should: value.map((val) => {
        return {
          bool: {
            should: [
              {
                match_phrase: {
                  [field]: val,
                },
              },
            ],
            minimum_should_match: 1,
          },
        };
      }),
      minimum_should_match: 1,
    },
  };
};

export const buildMatchAnyClause = (entry: EntryMatchAny): BooleanFilter => {
  const { operator } = entry;
  const matchAnyClause = getBaseMatchAnyClause(entry);

  if (operator === 'excluded') {
    return buildExclusionClause(matchAnyClause);
  } else {
    return matchAnyClause;
  }
};

export const buildExistsClause = (entry: EntryExists): BooleanFilter => {
  const { field, operator } = entry;
  const existsClause = {
    bool: {
      should: [
        {
          exists: {
            field,
          },
        },
      ],
      minimum_should_match: 1,
    },
  };

  if (operator === 'excluded') {
    return buildExclusionClause(existsClause);
  } else {
    return existsClause;
  }
};

const isBooleanFilter = (clause: object): clause is BooleanFilter => {
  const keys = Object.keys(clause);
  return keys.includes('bool') != null;
};

export const getBaseNestedClause = (
  entries: NonListEntry[],
  parentField: string
): BooleanFilter => {
  if (entries.length === 1) {
    const [singleNestedEntry] = entries;
    const innerClause = createInnerAndClauses(singleNestedEntry, parentField);
    return isBooleanFilter(innerClause) ? innerClause : { bool: {} };
  }

  return {
    bool: {
      filter: entries.map((nestedEntry) => createInnerAndClauses(nestedEntry, parentField)),
    },
  };
};

export const buildNestedClause = (entry: EntryNested): NestedFilter => {
  const { field, entries } = entry;

  const baseNestedClause = getBaseNestedClause(entries, field);

  return {
    nested: {
      path: field,
      query: baseNestedClause,
      score_mode: 'none',
    },
  };
};

export const createInnerAndClauses = (
  entry: NonListEntry,
  parent?: string
): BooleanFilter | NestedFilter => {
  if (entriesExists.is(entry)) {
    const field = parent != null ? `${parent}.${entry.field}` : entry.field;
    return buildExistsClause({ ...entry, field });
  } else if (entriesMatch.is(entry)) {
    const field = parent != null ? `${parent}.${entry.field}` : entry.field;
    return buildMatchClause({ ...entry, field });
  } else if (entriesMatchAny.is(entry)) {
    const field = parent != null ? `${parent}.${entry.field}` : entry.field;
    return buildMatchAnyClause({ ...entry, field });
  } else if (entriesNested.is(entry)) {
    return buildNestedClause(entry);
  } else {
    throw new TypeError(`Unexpected exception entry: ${entry}`);
  }
};
