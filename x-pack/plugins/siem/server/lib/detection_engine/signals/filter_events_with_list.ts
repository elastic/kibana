/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get } from 'lodash/fp';
import { Logger } from 'src/core/server';

import { ListItemArraySchema } from '../../../../../lists/common/schemas/response';
import { Type as ListValueType } from '../../../../../lists/common/schemas/common';
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
    if (exceptionsList == null) {
      return eventSearchResult;
    }

    // grab the signals with values found in the given exception lists.
    const filteredHitsPromises = exceptionsList.map(async exceptionItem => {
      if (exceptionItem.values == null || exceptionItem.values.length === 0) {
        throw new Error('Malformed exception list provided');
      }
      // acquire the list values we are checking for.
      const valuesOfGivenType = eventSearchResult.hits.hits.reduce((acc, searchResultItem) => {
        const valueField = get(exceptionItem.field, searchResultItem._source);
        if (valueField != null && !acc.has(valueField)) {
          acc.add(valueField);
        }
        return acc;
      }, new Set<SearchTypes>());

      const listSignals: ListItemArraySchema = await listClient.getListItemByValues({
        listId: exceptionItem.values[0].id ?? '',
        type: exceptionItem.values[0].name as ListValueType, // bad, I know, I'll write a typeguard later.
        value: [...valuesOfGivenType],
      });

      // create a set of list values that were a hit
      const badSet = new Set<SearchTypes>(listSignals.map(item => item.value));

      // do a single search after with these values.
      // painless script to do nested query in elasticsearch
      // filter out the search results that match with the values found in the list.
      const filteredEvents = eventSearchResult.hits.hits.filter(item => {
        const eventItem = get(exceptionItem.field, item._source);
        if (eventItem != null) {
          return !badSet.has(eventItem);
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
    throw new Error('Failed to query lists index');
  }
};
