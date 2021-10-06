/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { entriesList, ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

import { hasLargeValueList } from '@kbn/securitysolution-list-utils';

import { FilterEventsAgainstListOptions } from './types';
import { filterEvents } from './filter_events';
import { createFieldAndSetTuples } from './create_field_and_set_tuples';

/**
 * Filters events against a large value based list. It does this through these
 * steps below.
 *
 * 1. acquire the values from the specified fields to check
 * e.g. if the value list is checking against source.ip, gather
 * all the values for source.ip from the search response events.
 *
 * 2. search against the value list with the values found in the search result
 * and see if there are any matches. For every match, add that value to a set
 * that represents the "matched" values
 *
 * 3. filter the search result against the set from step 2 using the
 * given operator (included vs excluded).
 * acquire the list values we are checking for in the field.
 *
 * @param listClient The list client to use for queries
 * @param exceptionsList The exception list
 * @param logger Logger for messages
 * @param eventSearchResult The current events from the search
 */
export const filterEventsAgainstList = async <T>({
  listClient,
  exceptionsList,
  logger,
  eventSearchResult,
  buildRuleMessage,
}: FilterEventsAgainstListOptions<T>): Promise<estypes.SearchResponse<T>> => {
  try {
    const atLeastOneLargeValueList = exceptionsList.some(({ entries }) =>
      hasLargeValueList(entries)
    );

    if (!atLeastOneLargeValueList) {
      logger.debug(
        buildRuleMessage('no exception items of type list found - returning original search result')
      );
      return eventSearchResult;
    }

    const valueListExceptionItems = exceptionsList.filter((listItem: ExceptionListItemSchema) => {
      return listItem.entries.every((entry) => entriesList.is(entry));
    });

    const res = await valueListExceptionItems.reduce<Promise<Array<estypes.SearchHit<T>>>>(
      async (
        filteredAccum: Promise<Array<estypes.SearchHit<T>>>,
        exceptionItem: ExceptionListItemSchema
      ) => {
        const events = await filteredAccum;
        const fieldAndSetTuples = await createFieldAndSetTuples({
          events,
          exceptionItem,
          listClient,
          logger,
          buildRuleMessage,
        });
        const filteredEvents = filterEvents({ events, fieldAndSetTuples });
        const diff = eventSearchResult.hits.hits.length - filteredEvents.length;
        logger.debug(
          buildRuleMessage(`Exception with id ${exceptionItem.id} filtered out ${diff} events`)
        );
        return filteredEvents;
      },
      Promise.resolve<Array<estypes.SearchHit<T>>>(eventSearchResult.hits.hits)
    );

    return {
      took: eventSearchResult.took,
      timed_out: eventSearchResult.timed_out,
      _shards: eventSearchResult._shards,
      hits: {
        total: res.length,
        max_score: eventSearchResult.hits.max_score,
        hits: res,
      },
    };
  } catch (exc) {
    throw new Error(`Failed to query large value based lists index. Reason: ${exc.message}`);
  }
};
