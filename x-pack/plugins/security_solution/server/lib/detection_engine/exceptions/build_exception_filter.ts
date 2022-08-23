/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash/fp';

import type {
  EntryExists,
  EntryMatch,
  EntryMatchAny,
  EntryNested,
  ExceptionListItemSchema,
  OsTypeArray,
  EntryList,
  EntryMatchWildcard,
  Entry,
} from '@kbn/securitysolution-io-ts-list-types';
import {
  entriesExists,
  entriesMatch,
  entriesMatchAny,
  entriesNested,
  entriesList,
  entriesMatchWildcard,
} from '@kbn/securitysolution-io-ts-list-types';

import type { Filter } from '@kbn/es-query';
import type { ListClient } from '@kbn/lists-plugin/server';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { partition } from 'lodash';
import { hasLargeValueList } from '@kbn/securitysolution-list-utils';
import { MAXIMUM_SMALL_VALUE_LIST_SIZE } from '../../../../common/detection_engine/constants';

type ExceptionEntry = Entry | EntryNested;
export interface BooleanFilter {
  bool: estypes.QueryDslBoolQuery;
}

export interface NestedFilter {
  nested: estypes.QueryDslNestedQuery;
}

export const chunkExceptions = (
  exceptions: ExceptionListItemSchema[],
  chunkSize: number
): ExceptionListItemSchema[][] => {
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
): Promise<{ filter: BooleanFilter[]; unprocessable?: boolean }> => {
  let isUnprocessable = false;
  const entriesWithOsTypes = transformOsType(osTypes, entries);
  const exceptionItemFilter = await Promise.all(
    entriesWithOsTypes.map(async (entryWithOsType) => {
      const esFilter = await Promise.all(
        entryWithOsType.map(async (entry) => {
          const { filter, unprocessable = false } = await createInnerAndClauses({
            entry,
            listClient,
          });
          isUnprocessable = unprocessable;
          return filter;
        })
      );
      return {
        bool: {
          filter: esFilter,
        },
      };
    })
  );
  return { filter: exceptionItemFilter, unprocessable: isUnprocessable };
};

export const buildExceptionItemFilter = async (
  exceptionItem: ExceptionListItemSchema,
  listClient: ListClient
): Promise<{ filter: Array<BooleanFilter | NestedFilter>; unprocessable?: boolean }> => {
  let isUnprocessable = false;
  const { entries, os_types: osTypes } = exceptionItem;
  if (osTypes != null && osTypes.length > 0) {
    return buildExceptionItemFilterWithOsType(osTypes, entries, listClient);
  } else {
    if (entries.length === 1) {
      const { filter, unprocessable } = await createInnerAndClauses({
        entry: entries[0],
        listClient,
      });
      return { filter: [filter], unprocessable };
    } else {
      const esFilter = [
        {
          bool: {
            filter: await Promise.all(
              entries.map(async (entry) => {
                const { filter, unprocessable = false } = await createInnerAndClauses({
                  entry,
                  listClient,
                });
                isUnprocessable = unprocessable;
                return filter;
              })
            ),
          },
        },
      ];
      return { filter: esFilter, unprocessable: isUnprocessable };
    }
  }
};

export const createOrClauses = async (
  exceptionItems: ExceptionListItemSchema[],
  listClient: ListClient
): Promise<{
  orClauses: Array<BooleanFilter | NestedFilter>;
  unprocessableExceptionItems: ExceptionListItemSchema[];
}> => {
  const unprocessableExceptionItems: ExceptionListItemSchema[] = [];
  const orClauses: Array<Array<BooleanFilter | NestedFilter>> = [];
  await Promise.all(
    exceptionItems.map(async (exceptionItem) => {
      const { filter, unprocessable = false } = await buildExceptionItemFilter(
        exceptionItem,
        listClient
      );
      if (unprocessable) {
        unprocessableExceptionItems.push(exceptionItem);
        return;
      }
      orClauses.push(filter);
    })
  );
  return { orClauses: orClauses.flat(), unprocessableExceptionItems };
};

export const filterOutLargeValueLists = async (
  exceptionItems: ExceptionListItemSchema[],
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

        // Don't want any items, just the total list size
        const valueList = await listClient.findListItem({
          listId: id,
          perPage: 0,
          page: 0,
          filter: '',
          currentIndexPosition: 0,
        });

        if (valueList && valueList.total <= MAXIMUM_SMALL_VALUE_LIST_SIZE) {
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
  // Remove exception items with large value lists. These are evaluated
  // elsewhere for the moment being.
  const [exceptionsWithoutValueLists, valueListExceptions] = partition(
    lists,
    (item): item is ExceptionListItemSchema => !hasLargeValueList(item.entries)
  );

  // Exceptions that we will convert into Filters and put into an ES request
  const exceptionsWithoutLargeValueLists: ExceptionListItemSchema[] = [
    ...exceptionsWithoutValueLists,
  ];

  // Exceptions that contain large value list exceptions and will be processed later on in rule execution
  const unprocessedExceptions: ExceptionListItemSchema[] = [];

  const { filteredExceptions, largeValueListExceptions } = await filterOutLargeValueLists(
    valueListExceptions,
    listClient
  );
  exceptionsWithoutLargeValueLists.push(...filteredExceptions);
  unprocessedExceptions.push(...largeValueListExceptions);

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
    const { orClauses: clause, unprocessableExceptionItems } = await createOrClauses(
      exceptionsWithoutLargeValueLists,
      listClient
    );
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    exceptionFilter.query!.bool!.should = clause;
    unprocessedExceptions.concat(unprocessableExceptionItems);
    return { filter: exceptionFilter, unprocessedExceptions };
  } else {
    const chunks = chunkExceptions(exceptionsWithoutLargeValueLists, chunkSize);

    const filters = await Promise.all(
      chunks.map(async (exceptionsChunk) => {
        const { orClauses, unprocessableExceptionItems } = await createOrClauses(
          exceptionsChunk,
          listClient
        );
        unprocessedExceptions.concat(unprocessableExceptionItems);
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

export const buildMatchWildcardClause = (entry: EntryMatchWildcard): BooleanFilter => {
  const { field, operator, value } = entry;
  const wildcardClause = {
    bool: {
      filter: {
        wildcard: {
          [field]: value,
        },
      },
    },
  };

  if (operator === 'excluded') {
    return buildExclusionClause(wildcardClause);
  } else {
    return wildcardClause;
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

export const buildIpRangeClauses = (
  ranges: string[],
  field: string
): estypes.QueryDslQueryContainer[] =>
  ranges.map((range) => {
    const [gte, lte] = range.split('-');
    return {
      range: {
        [field]: {
          gte,
          lte,
        },
      },
    };
  });

export const buildTextClauses = (
  textValues: string[],
  field: string
): estypes.QueryDslQueryContainer[] =>
  textValues.map((value) => {
    return {
      match: {
        [field]: {
          query: value,
          operator: 'and',
        },
      },
    };
  });

export const buildListClause = async (
  entry: EntryList,
  listClient: ListClient
): Promise<{ listClause: BooleanFilter; unprocessable?: boolean }> => {
  const {
    field,
    operator,
    list: { type },
  } = entry;
  let unprocessable = false;

  const list = await listClient.findAllListItems({
    listId: entry.list.id,
    filter: '',
  });
  if (list == null) {
    throw new TypeError(`Cannot find list: "${entry.list.id}"`);
  }
  const listValues = list.data.map((listItem) => listItem.value);

  if (type === 'ip_range') {
    const [dashNotationRange, slashNotationRange] = partition(listValues, (value) => {
      return value.includes('-');
    });
    if (dashNotationRange.length > 200) {
      unprocessable = true;
    }
    const rangeClauses = buildIpRangeClauses(dashNotationRange, field);
    if (slashNotationRange.length > 0) {
      rangeClauses.push({
        terms: {
          [field]: slashNotationRange,
        },
      });
    }
    return {
      listClause: {
        bool: {
          [operator === 'excluded' ? 'must_not' : 'should']: rangeClauses,
          minimum_should_match: 1,
        },
      },
      unprocessable,
    };
  }

  if (type === 'text') {
    const textClauses = buildTextClauses(listValues, field);
    if (textClauses.length > 200) {
      unprocessable = true;
    }
    return {
      listClause: {
        bool: {
          [operator === 'excluded' ? 'must_not' : 'should']: textClauses,
          minimum_should_match: 1,
        },
      },
      unprocessable,
    };
  }

  return {
    listClause: {
      bool: {
        [operator === 'excluded' ? 'must_not' : 'filter']: {
          terms: {
            [field]: listValues,
          },
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
        entries.map(async (nestedEntry) => {
          const { filter } = await createInnerAndClauses({
            entry: nestedEntry,
            parent: parentField,
            listClient,
          });
          return filter;
        })
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
}): Promise<{ filter: BooleanFilter | NestedFilter; unprocessable?: boolean }> => {
  const field = parent != null ? `${parent}.${entry.field}` : entry.field;
  if (entriesExists.is(entry)) {
    return { filter: buildExistsClause({ ...entry, field }) };
  } else if (entriesMatch.is(entry)) {
    return { filter: buildMatchClause({ ...entry, field }) };
  } else if (entriesMatchAny.is(entry)) {
    return { filter: buildMatchAnyClause({ ...entry, field }) };
  } else if (entriesMatchWildcard.is(entry)) {
    return { filter: buildMatchWildcardClause({ ...entry, field }) };
  } else if (entriesList.is(entry)) {
    const { listClause, unprocessable } = await buildListClause({ ...entry, field }, listClient);
    return { filter: listClause, unprocessable };
  } else if (entriesNested.is(entry)) {
    return { filter: await buildNestedClause(entry, listClient) };
  } else {
    throw new TypeError(`Unexpected exception entry: ${entry}`);
  }
};
