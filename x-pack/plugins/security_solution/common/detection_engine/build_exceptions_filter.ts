/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  buildEsQuery,
  EsQueryConfig,
  Filter,
  IIndexPattern,
} from '../../../../../src/plugins/data/common';
import {
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
  Entry,
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

export const chunkExceptions = (
  exceptions: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>,
  chunkSize: number
): Array<Array<ExceptionListItemSchema | CreateExceptionListItemSchema>> => {
  if (exceptions.length === 0) {
    return [];
  } else if (exceptions.length <= chunkSize) {
    return [exceptions];
  } else {
    const chunkedFilters: Array<
      Array<ExceptionListItemSchema | CreateExceptionListItemSchema>
    > = [];
    for (let index = 0; index < exceptions.length; index += chunkSize) {
      const exceptionsChunks = exceptions.slice(index, index + chunkSize);
      chunkedFilters.push(exceptionsChunks);
    }
    return chunkedFilters;
  }
};

export const buildExceptionItemFilter = (
  exceptionItem: ExceptionListItemSchema | CreateExceptionListItemSchema
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
  exceptionItems: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>
): Array<BooleanFilter | NestedFilter> => {
  return exceptionItems.map((exceptionItem) => buildExceptionItemFilter(exceptionItem));
};

export const buildExceptionFilter = ({
  lists,
  config,
  excludeExceptions,
  chunkSize,
  indexPattern,
}: {
  lists: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>;
  config: EsQueryConfig;
  excludeExceptions: boolean;
  chunkSize: number;
  indexPattern?: IIndexPattern;
}): Filter | undefined => {
  if (lists.length === 0) {
    return undefined;
  }

  const chunks = chunkExceptions(lists, chunkSize);

  const filters: Filter[] = chunks.flatMap((exceptionsChunk) => {
    const orClauses = createOrClauses(exceptionsChunk);
    // console.log('CLAUSES', JSON.stringify(orClauses));
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

  const clauses = buildEsQuery(indexPattern, [], filters, config).bool.filter;
  const shouldClause = clauses.flatMap((clause) => clause.bool.should);

  return {
    meta: {
      alias: null,
      negate: excludeExceptions,
      disabled: false,
    },
    query: {
      bool: {
        should: shouldClause,
      },
    },
  };
};

export const buildExclusionClause = (booleanFilter: BooleanFilter): BooleanFilter => {
  return {
    bool: {
      must_not: booleanFilter,
    },
  };
};

export const buildMatchClause = (entry: EntryMatch, wrapInBooleanFilter = true): BooleanFilter => {
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

export const getBaseNestedClause = (entries: Entry[], parentField: string): BooleanFilter => {
  if (entries.length === 1) {
    const [singleNestedEntry] = entries;
    return createInnerAndClauses(singleNestedEntry, parentField);
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
  entry: EntryMatch | EntryMatchAny | EntryNested | EntryExists,
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
    throw new Error(`Unexpected exception entry: ${entry}`);
  }
};
