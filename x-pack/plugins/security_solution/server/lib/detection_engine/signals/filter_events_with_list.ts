/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get } from 'lodash/fp';
import { Logger } from 'src/core/server';

import { ListClient } from '../../../../../lists/server';
import { SignalSearchResponse, SearchTypes, SignalSource } from './types';
import { BuildRuleMessage } from './rule_messages';
import {
  entriesList,
  EntryList,
  ExceptionListItemSchema,
} from '../../../../../lists/common/schemas';
import { hasLargeValueList } from '../../../../common/detection_engine/utils';
import { SearchHit } from '../../types';

interface FilterEventsAgainstList {
  listClient: ListClient;
  exceptionsList: ExceptionListItemSchema[];
  logger: Logger;
  eventSearchResult: SignalSearchResponse;
  buildRuleMessage: BuildRuleMessage;
}

export const filterEventsAgainstList = async ({
  listClient,
  exceptionsList,
  logger,
  eventSearchResult,
  buildRuleMessage,
}: FilterEventsAgainstList): Promise<SignalSearchResponse> => {
  try {
    logger.debug(buildRuleMessage(`exceptionsList: ${JSON.stringify(exceptionsList, null, 2)}`));
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
      logger.debug(buildRuleMessage('about to return original search result'));
      return eventSearchResult;
    }

    // narrow unioned type to be single
    const isStringableType = (val: SearchTypes) =>
      ['string', 'number', 'boolean'].includes(typeof val);
    // const filteredAccum = eventSearchResult;
    // grab the signals with values found in the given exception lists.

    // yara's changes below
    // const filteredHitsPromises = exceptionItemsWithLargeValueLists.map(
    //   async (exceptionItem: ExceptionListItemSchema) => {
    //     const { entries } = exceptionItem;
    // end of yara's changes
    // maybe turn this into a forEach?
    const allExceptionsEntries = exceptionsList
      .map((excItem: ExceptionListItemSchema) => {
        const { entries } = excItem;
        return entries;
      })
      .flat();
    const res = await allExceptionsEntries
      .filter((t): t is EntryList => entriesList.is(t))
      .reduce<Promise<SignalSearchResponse['hits']['hits']>>(
        async (filteredAccum: Promise<SignalSearchResponse['hits']['hits']>, entry: EntryList) => {
          const { list, field, operator } = entry;
          const { id, type } = list;

          // acquire the list values we are checking for.
          const valuesOfGivenType = (await filteredAccum).reduce((acc, searchResultItem) => {
            const valueField = get(field, searchResultItem._source);
            if (valueField != null && isStringableType(valueField)) {
              acc.add(valueField.toString());
            }
            return acc;
          }, new Set<string>());
          logger.debug(`valuesOfGivenType: ${JSON.stringify([...valuesOfGivenType], null, 2)}`);

          // matched will contain any list items that matched with the
          // values passed in from the Set.
          const matchedListItems = await listClient.getListItemByValues({
            listId: id,
            type,
            value: [...valuesOfGivenType],
          });

          logger.debug(`matchedListItems: ${JSON.stringify(matchedListItems, null, 2)}`);
          // create a set of list values that were a hit - easier to work with
          const matchedListItemsSet = new Set<SearchTypes>(
            matchedListItems.map((item) => item.value)
          );

          // do a single search after with these values.
          // painless script to do nested query in elasticsearch
          // filter out the search results that match with the values found in the list.
          const filteredEvents = (await filteredAccum).filter((item) => {
            const eventItem = get(entry.field, item._source);
            if (operator === 'included') {
              // only create a signal if the event is not in the value list
              if (eventItem != null) {
                return !matchedListItemsSet.has(eventItem);
              }
            } else if (operator === 'excluded') {
              // only create a signal if the event is in the value list
              if (eventItem != null) {
                return matchedListItemsSet.has(eventItem);
              }
            }
            return false;
          });
          const diff = eventSearchResult.hits.hits.length - filteredEvents.length;
          logger.debug(buildRuleMessage(`Lists filtered out ${diff} events`));
          const toReturn = await filteredEvents;
          return toReturn;
        },
        Promise.resolve<SignalSearchResponse['hits']['hits']>(eventSearchResult.hits.hits)
      );

    const toReturn: SignalSearchResponse = {
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
