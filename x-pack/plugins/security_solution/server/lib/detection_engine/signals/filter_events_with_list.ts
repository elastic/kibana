/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get } from 'lodash/fp';
import { Logger } from 'src/core/server';

import { ListClient } from '../../../../../lists/server';
import { BuildRuleMessage } from './rule_messages';
import {
  EntryList,
  ExceptionListItemSchema,
  entriesList,
  Type,
} from '../../../../../lists/common/schemas';
import { hasLargeValueList } from '../../../../common/detection_engine/utils';
import { SearchTypes } from '../../../../common/detection_engine/types';
import { SearchResponse } from '../../types';

// narrow unioned type to be single
const isStringableType = (val: SearchTypes): val is string | number | boolean =>
  ['string', 'number', 'boolean'].includes(typeof val);

const isStringableArray = (val: SearchTypes): val is Array<string | number | boolean> => {
  if (!Array.isArray(val)) {
    return false;
  }
  // TS does not allow .every to be called on val as-is, even though every type in the union
  // is an array. https://github.com/microsoft/TypeScript/issues/36390
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (val as any[]).every((subVal: string | number | boolean | object) =>
    isStringableType(subVal)
  );
};

export const createSetToFilterAgainst = async <T>({
  events,
  field,
  listId,
  listType,
  listClient,
  logger,
  buildRuleMessage,
}: {
  events: SearchResponse<T>['hits']['hits'];
  field: string;
  listId: string;
  listType: Type;
  listClient: ListClient;
  logger: Logger;
  buildRuleMessage: BuildRuleMessage;
}): Promise<Set<SearchTypes>> => {
  const valuesFromSearchResultField = events.reduce((acc, searchResultItem) => {
    const valueField = get(field, searchResultItem._source);
    if (valueField != null) {
      if (isStringableType(valueField)) {
        acc.add(valueField.toString());
      } else if (isStringableArray(valueField)) {
        valueField.forEach((subVal: string | number | boolean) => acc.add(subVal.toString()));
      }
    }
    return acc;
  }, new Set<string>());
  logger.debug(
    `number of distinct values from ${field}: ${[...valuesFromSearchResultField].length}`
  );

  // matched will contain any list items that matched with the
  // values passed in from the Set.
  const matchedListItems = await listClient.getListItemByValues({
    listId,
    type: listType,
    value: [...valuesFromSearchResultField],
  });

  logger.debug(`number of matched items from list with id ${listId}: ${matchedListItems.length}`);
  // create a set of list values that were a hit - easier to work with
  const matchedListItemsSet = new Set<SearchTypes>(matchedListItems.map((item) => item.value));
  return matchedListItemsSet;
};

export const filterEventsAgainstList = async <T>({
  listClient,
  exceptionsList,
  logger,
  eventSearchResult,
  buildRuleMessage,
}: {
  listClient: ListClient;
  exceptionsList: ExceptionListItemSchema[];
  logger: Logger;
  eventSearchResult: SearchResponse<T>;
  buildRuleMessage: BuildRuleMessage;
}): Promise<SearchResponse<T>> => {
  try {
    if (exceptionsList == null || exceptionsList.length === 0) {
      logger.debug(buildRuleMessage('about to return original search result'));
      return eventSearchResult;
    }

    const exceptionItemsWithLargeValueLists = exceptionsList.reduce<ExceptionListItemSchema[]>(
      (acc, exception) => {
        const { entries } = exception;
        if (hasLargeValueList(entries)) {
          return [...acc, exception];
        }

        return acc;
      },
      []
    );

    if (exceptionItemsWithLargeValueLists.length === 0) {
      logger.debug(
        buildRuleMessage('no exception items of type list found - returning original search result')
      );
      return eventSearchResult;
    }

    const valueListExceptionItems = exceptionsList.filter((listItem: ExceptionListItemSchema) => {
      return listItem.entries.every((entry) => entriesList.is(entry));
    });

    // now that we have all the exception items which are value lists (whether single entry or have multiple entries)
    const res = await valueListExceptionItems.reduce<Promise<SearchResponse<T>['hits']['hits']>>(
      async (
        filteredAccum: Promise<SearchResponse<T>['hits']['hits']>,
        exceptionItem: ExceptionListItemSchema
      ) => {
        // 1. acquire the values from the specified fields to check
        // e.g. if the value list is checking against source.ip, gather
        // all the values for source.ip from the search response events.

        // 2. search against the value list with the values found in the search result
        // and see if there are any matches. For every match, add that value to a set
        // that represents the "matched" values

        // 3. filter the search result against the set from step 2 using the
        // given operator (included vs excluded).
        // acquire the list values we are checking for in the field.
        const filtered = await filteredAccum;
        const typedEntries = exceptionItem.entries.filter((entry): entry is EntryList =>
          entriesList.is(entry)
        );
        const fieldAndSetTuples = await Promise.all(
          typedEntries.map(async (entry) => {
            const { list, field, operator } = entry;
            const { id, type } = list;
            const matchedSet = await createSetToFilterAgainst({
              events: filtered,
              field,
              listId: id,
              listType: type,
              listClient,
              logger,
              buildRuleMessage,
            });

            return Promise.resolve({ field, operator, matchedSet });
          })
        );

        // check if for each tuple, the entry is not in both for when two value list entries exist.
        // need to re-write this as a reduce.
        const filteredEvents = filtered.filter((item) => {
          const vals = fieldAndSetTuples.map((tuple) => {
            const eventItem = get(tuple.field, item._source);
            if (tuple.operator === 'included') {
              // only create a signal if the field value is not in the value list
              if (eventItem != null) {
                if (isStringableType(eventItem)) {
                  return !tuple.matchedSet.has(eventItem);
                } else if (isStringableArray(eventItem)) {
                  return !eventItem.some((val) => tuple.matchedSet.has(val));
                }
              }
              return true;
            } else if (tuple.operator === 'excluded') {
              // only create a signal if the field value is in the value list
              if (eventItem != null) {
                if (isStringableType(eventItem)) {
                  return tuple.matchedSet.has(eventItem);
                } else if (isStringableArray(eventItem)) {
                  return eventItem.some((val) => tuple.matchedSet.has(val));
                }
              }
              return true;
            }
            return false;
          });
          return vals.some((value) => value);
        });
        const diff = eventSearchResult.hits.hits.length - filteredEvents.length;
        logger.debug(
          buildRuleMessage(`Exception with id ${exceptionItem.id} filtered out ${diff} events`)
        );
        const toReturn = filteredEvents;
        return toReturn;
      },
      Promise.resolve<SearchResponse<T>['hits']['hits']>(eventSearchResult.hits.hits)
    );

    const toReturn: SearchResponse<T> = {
      took: eventSearchResult.took,
      timed_out: eventSearchResult.timed_out,
      _shards: eventSearchResult._shards,
      hits: {
        total: res.length,
        max_score: eventSearchResult.hits.max_score,
        hits: res,
      },
    };
    return toReturn;
  } catch (exc) {
    throw new Error(`Failed to query lists index. Reason: ${exc.message}`);
  }
};
