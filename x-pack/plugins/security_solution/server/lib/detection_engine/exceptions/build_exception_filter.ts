/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash/fp';

import {
  EntryExists,
  EntryMatch,
  EntryMatchAny,
  EntryNested,
  ExceptionListItemSchema,
  entriesExists,
  entriesMatch,
  entriesMatchAny,
  entriesNested,
  OsTypeArray,
  EntryList,
  entriesList,
  EntriesArray,
} from '@kbn/securitysolution-io-ts-list-types';
import { Filter } from '@kbn/es-query';
import { ListClient } from '@kbn/lists-plugin/server';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { partition } from 'lodash';
import { hasLargeValueList } from '@kbn/securitysolution-list-utils';
import { MAXIMUM_VALUE_LIST_SIZE_FOR_EXCEPTIONS } from '../../../../common/detection_engine/constants';

// Removes wildcard entries as they're not currently supported for rule execution
export type ExceptionEntry = EntryMatch | EntryMatchAny | EntryNested | EntryExists | EntryList;

interface ExceptionListItemSchemaSansWildcard extends ExceptionListItemSchema {
  entries: ExceptionEntry[];
}

export type ExceptionItem = ExceptionListItemSchemaSansWildcard;

export interface BooleanFilter {
  bool: estypes.QueryDslBoolQuery;
}

export interface NestedFilter {
  nested: estypes.QueryDslNestedQuery;
}

export const hasWildcardEntry = (entries: EntriesArray): boolean => {
  return entries.some(({ type }) => type === 'wildcard');
};

export const chunkExceptions = (
  exceptions: ExceptionItem[],
  chunkSize: number
): ExceptionItem[][] => {
  return chunk(chunkSize, exceptions);
};

/**
 * Transforms the os_type into a regular filter as if the user had created it
 * from the fields for the next state of transforms which will create the elastic filters
 * from it.
 *
 * Note: We use two types of fields, the "host.os.type" and "host.os.name.caseless"
 * The endpoint/endgame agent has been using "host.os.name.caseless" as the same value as the ECS
 * value of "host.os.type" where the auditbeat, winlogbeat, etc... (other agents) are all using
 * "host.os.type". In order to be compatible with both, I create an "OR" between these two data types
 * where if either has a match then we will exclude it as part of the match. This should also be
 * forwards compatible for endpoints/endgame agents when/if they upgrade to using "host.os.type"
 * rather than using "host.os.name.caseless" values.
 *
 * Also we create another "OR" from the osType names so that if there are multiples such as ['windows', 'linux']
 * this will exclude anything with either 'windows' or with 'linux'
 * @param osTypes The os_type array from the REST interface that is an array such as ['windows', 'linux']
 * @param entries The entries to join the OR's with before the elastic filter change out
 */
export const transformOsType = (
  osTypes: OsTypeArray,
  entries: ExceptionEntry[]
): ExceptionEntry[][] => {
  const hostTypeTransformed = osTypes.map<ExceptionEntry[]>((osType) => {
    return [
      { field: 'host.os.type', operator: 'included', type: 'match', value: osType },
      ...entries,
    ];
  });
  const caseLessTransformed = osTypes.map<ExceptionEntry[]>((osType) => {
    return [
      { field: 'host.os.name.caseless', operator: 'included', type: 'match', value: osType },
      ...entries,
    ];
  });
  return [...hostTypeTransformed, ...caseLessTransformed];
};

/**
 * This builds an exception item filter with the os type
 * @param osTypes The os_type array from the REST interface that is an array such as ['windows', 'linux']
 * @param entries The entries to join the OR's with before the elastic filter change out
 */
export const buildExceptionItemFilterWithOsType = async (
  osTypes: OsTypeArray,
  entries: ExceptionEntry[],
  listClient: ListClient
): Promise<BooleanFilter[]> => {
  const entriesWithOsTypes = transformOsType(osTypes, entries);
  const exceptionItemFilter = await Promise.all(
    entriesWithOsTypes.map(async (entryWithOsType) => {
      return {
        bool: {
          filter: await Promise.all(
            entryWithOsType.map((entry) => createInnerAndClauses({ entry, listClient }))
          ),
        },
      };
    })
  );
  return exceptionItemFilter;
};

export const buildExceptionItemFilter = async (
  exceptionItem: ExceptionItem,
  listClient: ListClient
): Promise<Array<BooleanFilter | NestedFilter>> => {
  const { entries, os_types: osTypes } = exceptionItem;
  if (osTypes != null && osTypes.length > 0) {
    const exceptionItemFilter = await buildExceptionItemFilterWithOsType(
      osTypes,
      entries,
      listClient
    );
    return exceptionItemFilter;
  } else {
    if (entries.length === 1) {
      return [await createInnerAndClauses({ entry: entries[0], listClient })];
    } else {
      return [
        {
          bool: {
            filter: await Promise.all(
              entries.map((entry) => createInnerAndClauses({ entry, listClient }))
            ),
          },
        },
      ];
    }
  }
};

export const createOrClauses = async (
  exceptionItems: ExceptionItem[],
  listClient: ListClient
): Promise<Array<BooleanFilter | NestedFilter>> => {
  const orClauses = await Promise.all(
    exceptionItems.map((exceptionItem) => buildExceptionItemFilter(exceptionItem, listClient))
  );
  return orClauses.flat(); // TODO: does this work?
};

export const filterOutLargeValueLists = async (
  exceptionItems: ExceptionItem[],
  listClient: ListClient
) => {
  const [filteredExceptions, largeValueListExceptions] = partition(
    exceptionItems,
    (exceptionItem) => {
      const listEntries = exceptionItem.entries.filter((entry): entry is EntryList =>
        entriesList.is(entry)
      );
      return listEntries.every(async (listEntry) => {
        const {
          list: { id },
        } = listEntry;
        const valueList = await listClient.findListItem({
          listId: id,
          perPage: 0,
          page: 0,
          filter: '',
          currentIndexPosition: 0,
        });

        if (valueList && valueList.total <= MAXIMUM_VALUE_LIST_SIZE_FOR_EXCEPTIONS) {
          return true;
        }
      });
    }
  );
  return { filteredExceptions, largeValueListExceptions };
};

export const buildExceptionFilter = async ({
  lists,
  excludeExceptions,
  chunkSize,
  alias = null,
  listClient,
}: {
  lists: ExceptionListItemSchema[];
  excludeExceptions: boolean;
  chunkSize: number;
  alias: string | null;
  listClient: ListClient;
}): Promise<{ filter: Filter | undefined; unprocessedExceptions: ExceptionListItemSchema[] }> => {
  // Remove wildcard entries, they are not currently supported for rule exceptions
  const filteredLists: ExceptionItem[] = lists.filter(
    (item): item is ExceptionItem => !hasWildcardEntry(item.entries)
  );

  // Remove exception items with large value lists. These are evaluated
  // elsewhere for the moment being.
  const [exceptionsWithoutValueLists, valueListExceptions] = partition(
    filteredLists,
    (item): item is ExceptionItem => !hasLargeValueList(item.entries)
  );

  // Exceptions that we will convert into Filters and put into an ES request
  const exceptionsWithoutLargeValueLists: ExceptionItem[] = [...exceptionsWithoutValueLists];

  // Exceptions that contain large value list exceptions and will be processed later on in rule execution
  const unprocessedExceptions: ExceptionItem[] = [];

  filterOutLargeValueLists(valueListExceptions, listClient).then(
    ({ filteredExceptions, largeValueListExceptions }) => {
      exceptionsWithoutLargeValueLists.push(...filteredExceptions);
      unprocessedExceptions.push(...largeValueListExceptions);
    }
  );

  const exceptionFilter: Filter = {
    meta: {
      alias,
      disabled: false,
      negate: excludeExceptions,
    },
    query: {
      bool: {
        should: undefined,
      },
    },
  };

  if (exceptionsWithoutLargeValueLists.length === 0) {
    return { filter: undefined, unprocessedExceptions };
  } else if (exceptionsWithoutLargeValueLists.length <= chunkSize) {
    const clause = await createOrClauses(exceptionsWithoutLargeValueLists, listClient);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    exceptionFilter.query!.bool!.should = clause;
    return { filter: exceptionFilter, unprocessedExceptions };
  } else {
    const chunks = chunkExceptions(exceptionsWithoutLargeValueLists, chunkSize);

    const filters = await Promise.all(
      chunks.map(async (exceptionsChunk) => {
        const orClauses = await createOrClauses(exceptionsChunk, listClient);

        return {
          meta: {
            alias: null,
            disabled: false,
            negate: false,
          },
          query: {
            bool: {
              should: orClauses,
            },
          },
        };
      })
    );

    const clauses = filters.map<BooleanFilter>(({ query }) => query);

    const filter = {
      meta: {
        alias,
        disabled: false,
        negate: excludeExceptions,
      },
      query: {
        bool: {
          should: clauses,
        },
      },
    };
    return { filter, unprocessedExceptions };
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
      minimum_should_match: 1,
      should: [
        {
          match_phrase: {
            [field]: value,
          },
        },
      ],
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
        minimum_should_match: 1,
        should: [
          {
            match_phrase: {
              [field]: value[0],
            },
          },
        ],
      },
    };
  }

  return {
    bool: {
      minimum_should_match: 1,
      should: value.map((val) => {
        return {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                match_phrase: {
                  [field]: val,
                },
              },
            ],
          },
        };
      }),
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
      minimum_should_match: 1,
      should: [
        {
          exists: {
            field,
          },
        },
      ],
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

export const buildListClause = async (
  entry: EntryList,
  listClient: ListClient
): Promise<BooleanFilter> => {
  const { field, operator } = entry;
  const list = await listClient.findListItem({
    listId: entry.list.id,
    perPage: MAXIMUM_VALUE_LIST_SIZE_FOR_EXCEPTIONS,
    page: 0,
    filter: '',
    currentIndexPosition: 0,
  });
  const listValues = list?.data.map((listItem) => listItem.value);
  return {
    bool: {
      [operator === 'excluded' ? 'must_not' : 'must']: {
        terms: {
          [field]: listValues,
        },
      },
    },
  };
};

export const getBaseNestedClause = async (
  entries: ExceptionEntry[],
  parentField: string,
  listClient: ListClient
): Promise<BooleanFilter> => {
  if (entries.length === 1) {
    const [singleNestedEntry] = entries;
    const innerClause = await createInnerAndClauses({
      entry: singleNestedEntry,
      parent: parentField,
      listClient,
    });
    return isBooleanFilter(innerClause) ? innerClause : { bool: {} };
  }

  return {
    bool: {
      filter: await Promise.all(
        entries.map((nestedEntry) =>
          createInnerAndClauses({ entry: nestedEntry, parent: parentField, listClient })
        )
      ),
    },
  };
};

export const buildNestedClause = async (
  entry: EntryNested,
  listClient: ListClient
): Promise<NestedFilter> => {
  const { field, entries } = entry;

  const baseNestedClause = await getBaseNestedClause(entries, field, listClient);

  return {
    nested: {
      path: field,
      query: baseNestedClause,
      score_mode: 'none',
    },
  };
};

export const createInnerAndClauses = async ({
  entry,
  parent,
  listClient,
}: {
  entry: ExceptionEntry;
  parent?: string;
  listClient: ListClient;
}): Promise<BooleanFilter | NestedFilter> => {
  if (entriesExists.is(entry)) {
    const field = parent != null ? `${parent}.${entry.field}` : entry.field;
    return buildExistsClause({ ...entry, field });
  } else if (entriesMatch.is(entry)) {
    const field = parent != null ? `${parent}.${entry.field}` : entry.field;
    return buildMatchClause({ ...entry, field });
  } else if (entriesMatchAny.is(entry)) {
    const field = parent != null ? `${parent}.${entry.field}` : entry.field;
    return buildMatchAnyClause({ ...entry, field });
  } else if (entriesList.is(entry)) {
    const field = parent != null ? `${parent}.${entry.field}` : entry.field;
    const listClause = await buildListClause({ ...entry, field }, listClient);
    return listClause;
  } else if (entriesNested.is(entry)) {
    return buildNestedClause(entry, listClient);
  } else {
    throw new TypeError(`Unexpected exception entry: ${entry}`);
  }
};
