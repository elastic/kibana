/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get } from 'lodash/fp';
import { Logger } from 'src/core/server';

import { List } from '../../../../common/detection_engine/schemas/types/lists_default_array';
import { type } from '../../../../../lists/common/schemas/common';
import { ListClient } from '../../../../../lists/server';
import { SignalSearchResponse, SearchTypes } from './types';
import { RuleAlertParams } from '../types';

interface FilterEventsAgainstList {
  listClient: ListClient;
  exceptionsList: RuleAlertParams['exceptions_list'];
  logger: Logger;
  eventSearchResult: SignalSearchResponse;
}

export const filterEventsAgainstList = async ({
  listClient,
  exceptionsList,
  logger,
  eventSearchResult,
}: FilterEventsAgainstList): Promise<SignalSearchResponse> => {
  try {
    if (exceptionsList == null || exceptionsList.length === 0) {
      return eventSearchResult;
    }

    // narrow unioned type to be single
    const isStringableType = (val: SearchTypes) =>
      ['string', 'number', 'boolean'].includes(typeof val);
    // grab the signals with values found in the given exception lists.
    const filteredHitsPromises = exceptionsList
      .filter((exceptionItem: List) => exceptionItem.values_type === 'list')
      .map(async (exceptionItem: List) => {
        if (exceptionItem.values == null || exceptionItem.values.length === 0) {
          throw new Error('Malformed exception list provided');
        }
        if (!type.is(exceptionItem.values[0].name)) {
          throw new Error(
            `Unsupported list type used, please use one of ${Object.keys(type.keys).join()}`
          );
        }
        if (!exceptionItem.values[0].id) {
          throw new Error(`Missing list id for exception on field ${exceptionItem.field}`);
        }
        // acquire the list values we are checking for.
        const valuesOfGivenType = eventSearchResult.hits.hits.reduce((acc, searchResultItem) => {
          const valueField = get(exceptionItem.field, searchResultItem._source);
          if (valueField != null && isStringableType(valueField)) {
            acc.add(valueField.toString());
          }
          return acc;
        }, new Set<string>());

        // matched will contain any list items that matched with the
        // values passed in from the Set.
        const matchedListItems = await listClient.getListItemByValues({
          listId: exceptionItem.values[0].id,
          type: exceptionItem.values[0].name,
          value: [...valuesOfGivenType],
        });

        // create a set of list values that were a hit - easier to work with
        const matchedListItemsSet = new Set<SearchTypes>(
          matchedListItems.map((item) => item.value)
        );

        // do a single search after with these values.
        // painless script to do nested query in elasticsearch
        // filter out the search results that match with the values found in the list.
        const operator = exceptionItem.values_operator;
        const filteredEvents = eventSearchResult.hits.hits.filter((item) => {
          const eventItem = get(exceptionItem.field, item._source);
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
        logger.debug(`Lists filtered out ${diff} events`);
        return filteredEvents;
      });

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
