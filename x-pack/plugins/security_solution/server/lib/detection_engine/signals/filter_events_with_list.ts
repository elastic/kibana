/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get } from 'lodash/fp';
import { Logger } from 'src/core/server';

import { ListClient } from '../../../../../lists/server';
import { SignalSearchResponse, SearchTypes } from './types';
import { BuildRuleMessage } from './rule_messages';
import {
  entriesList,
  EntryList,
  ExceptionListItemSchema,
} from '../../../../../lists/common/schemas';
import { hasLargeValueList } from '../../../../common/detection_engine/utils';

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
    // grab the signals with values found in the given exception lists.
    const filteredHitsPromises = exceptionItemsWithLargeValueLists.map(
      async (exceptionItem: ExceptionListItemSchema) => {
        const { entries } = exceptionItem;

        const filteredHitsEntries = entries
          .filter((t): t is EntryList => entriesList.is(t))
          .map(async (entry) => {
            const { list, field, operator } = entry;
            const { id, type } = list;

            // acquire the list values we are checking for.
            const valuesOfGivenType = eventSearchResult.hits.hits.reduce(
              (acc, searchResultItem) => {
                const valueField = get(field, searchResultItem._source);

                if (valueField != null && isStringableType(valueField)) {
                  acc.add(valueField.toString());
                }
                return acc;
              },
              new Set<string>()
            );

            // matched will contain any list items that matched with the
            // values passed in from the Set.
            const matchedListItems = await listClient.getListItemByValues({
              listId: id,
              type,
              value: [...valuesOfGivenType],
            });

            // create a set of list values that were a hit - easier to work with
            const matchedListItemsSet = new Set<SearchTypes>(
              matchedListItems.map((item) => item.value)
            );

            // do a single search after with these values.
            // painless script to do nested query in elasticsearch
            // filter out the search results that match with the values found in the list.
            const filteredEvents = eventSearchResult.hits.hits.filter((item) => {
              const eventItem = get(entry.field, item._source);
              if (operator === 'included') {
                if (eventItem != null) {
                  return !matchedListItemsSet.has(eventItem);
                }
              } else if (operator === 'excluded') {
                if (eventItem != null) {
                  return matchedListItemsSet.has(eventItem);
                }
              }
              return false;
            });
            const diff = eventSearchResult.hits.hits.length - filteredEvents.length;
            logger.debug(buildRuleMessage(`Lists filtered out ${diff} events`));
            return filteredEvents;
          });

        return (await Promise.all(filteredHitsEntries)).flat();
      }
    );

    const filteredHits = await Promise.all(filteredHitsPromises);
    const toReturn: SignalSearchResponse = {
      took: eventSearchResult.took,
      timed_out: eventSearchResult.timed_out,
      _shards: eventSearchResult._shards,
      hits: {
        total: filteredHits.length,
        max_score: eventSearchResult.hits.max_score,
        hits: filteredHits.flat(),
      },
    };

    return toReturn;
  } catch (exc) {
    throw new Error(`Failed to query lists index. Reason: ${exc.message}`);
  }
};
