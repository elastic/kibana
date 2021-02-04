/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateSetToFilterAgainstOptions } from './types';

/**
 * Creates a field set to filter against using the stringed version of the
 * data type for compare. Creates a set of list values that are stringified that
 * are easier to work with as well as ensures that deep values can work since it turns
 * things into a string using JSON.stringify().
 *
 * @param events The events to filter against
 * @param field The field checking against the list
 * @param listId The list id for the list function call
 * @param listType The type of list for the list function call
 * @param listClient The list client API
 * @param logger logger for errors, debug, etc...
 */
export const createSetToFilterAgainst = async <T>({
  events,
  field,
  listId,
  listType,
  listClient,
  logger,
  buildRuleMessage,
}: CreateSetToFilterAgainstOptions<T>): Promise<Set<unknown>> => {
  const valuesFromSearchResultField = events.reduce((acc, searchResultItem) => {
    const valueField = searchResultItem.fields ? searchResultItem.fields[field] : undefined;
    if (valueField != null) {
      acc.add(valueField);
    }
    return acc;
  }, new Set<unknown>());

  logger.debug(
    buildRuleMessage(
      `number of distinct values from ${field}: ${[...valuesFromSearchResultField].length}`
    )
  );

  const matchedListItems = await listClient.searchListItemByValues({
    listId,
    type: listType,
    value: [...valuesFromSearchResultField],
  });

  logger.debug(
    buildRuleMessage(
      `number of matched items from list with id ${listId}: ${matchedListItems.length}`
    )
  );

  return new Set<unknown>(
    matchedListItems
      .filter((item) => item.items.length !== 0)
      .map((item) => JSON.stringify(item.value))
  );
};
