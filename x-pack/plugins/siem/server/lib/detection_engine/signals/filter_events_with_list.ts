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
import { SignalSearchResponse } from './types';
import { RuleAlertParams } from '../types';

interface FilterEventsAgainstList {
  listClient: ListClient;
  exceptionsList: RuleAlertParams['exceptions_list'];
  logger: Logger;
  eventSearchResult: SignalSearchResponse;
  // type: ListValueType;
  // listId: string;
  // field: string;
}

export const filterEventsAgainstList = async ({
  listClient,
  exceptionsList,
  logger,
  eventSearchResult,
}: // type,
// listId,
// field,
FilterEventsAgainstList): Promise<SignalSearchResponse> => {
  try {
    if (exceptionsList == null) {
      return eventSearchResult;
    }

    // grab the signals with values found in the given exception lists.
    const filteredHitsPromises = exceptionsList.map(async exceptionItem => {
      // acquire the list values we are checking for.
      const valuesOfGivenType = eventSearchResult.hits.hits
        .map(searchResultItem => get(exceptionItem.field, searchResultItem._source))
        .filter((searchResultItem: string) => searchResultItem != null);
      const valueSet = new Set<string>(valuesOfGivenType); // make them small
      if (exceptionItem.values == null || exceptionItem.values.length === 0) {
        throw new Error('Malformed exception list provided');
      }
      const listSignals: ListItemArraySchema = await listClient.getListItemByValues({
        listId: exceptionItem.values[0].id!,
        type: exceptionItem.values[0].name as ListValueType, // bad, I know, I'll write a typeguard later.
        value: [...valueSet],
      });
      // create a set of list values that were a hit
      const badSet = new Set<string>(listSignals.map(item => item.value));
      // console.log({ badSet });
      // filter out the search results that match with the values found in the list.
      const filteredEvents = eventSearchResult.hits.hits.filter(item =>
        get(exceptionItem.field, item._source)
          ? !badSet.has(get(exceptionItem.field, item._source))
          : true
      );
      const diff = eventSearchResult.hits.hits.length - filteredEvents.length;
      logger.debug(`Lists filtered out ${diff} events`);
      return filteredEvents;
    });
    // const listSignals: ListItemArraySchema = await listClient.getListItemByValues({
    //   listId,
    //   type,
    //   value: [...valueSet],
    // });

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
