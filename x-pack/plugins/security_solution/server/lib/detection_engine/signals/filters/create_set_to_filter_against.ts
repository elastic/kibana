/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';
import { SearchTypes } from '../../../../../common/detection_engine/types';
import { CreateSetToFilterAgainst } from './types';

export const createSetToFilterAgainst = async ({
  events,
  field,
  listId,
  listType,
  listClient,
  logger,
}: CreateSetToFilterAgainst): Promise<Set<SearchTypes>> => {
  // narrow unioned type to be single
  const isStringableType = (val: SearchTypes) =>
    ['string', 'number', 'boolean'].includes(typeof val);
  const valuesFromSearchResultField = events.reduce((acc, searchResultItem) => {
    const valueField = get(field, searchResultItem._source);
    if (valueField != null && isStringableType(valueField)) {
      acc.add(valueField.toString());
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
