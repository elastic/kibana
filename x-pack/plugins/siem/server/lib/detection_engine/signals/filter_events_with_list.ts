/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get } from 'lodash/fp';

import { ListClientType, Type as ListValueType } from '../../../../../lists/server';
import { SignalSearchResponse } from './types';

interface FilterEventsAgainstList {
  listClient: ListClientType;
  eventSearchResult: SignalSearchResponse;
  type: ListValueType;
  listId: string;
  field: string;
}

export const filterEventsAgainstList = async ({
  listClient,
  eventSearchResult,
  type,
  listId,
  field,
}: FilterEventsAgainstList): Promise<SignalSearchResponse> => {
  try {
    // acquire the list values we are checking for.
    const valuesOfGivenType = eventSearchResult.hits.hits
      .map(item => get(field, item._source))
      .filter((item: string) => item != null);
    const valueSet = new Set<string>(valuesOfGivenType); // make them small

    // get the ips that match with items in our list
    const listSignals = await listClient.getListItemByValues({
      listId,
      type,
      value: [...valueSet],
    });
    // create a set of list values that were a hit
    const badSet = new Set<string>(listSignals.map(item => item.value));
    // console.log({ badSet });
    // filter out the search results that match with the values found in the list.
    const filteredEvents = eventSearchResult.hits.hits.filter(item =>
      item._source.source?.[type] ? !badSet.has(item._source.source?.[type]) : true
    );

    const toReturn: SignalSearchResponse = {
      took: eventSearchResult.took,
      timed_out: eventSearchResult.timed_out,
      _shards: eventSearchResult._shards,
      hits: {
        total: eventSearchResult.hits.total,
        max_score: eventSearchResult.hits.max_score,
        hits: filteredEvents,
      },
    };

    return toReturn;
  } catch (exc) {
    throw new Error('Failed to query lists index');
  }
};
