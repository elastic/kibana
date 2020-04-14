/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ScopedClusterClient } from 'kibana/server';

import { ListsItemsSchema } from '../../common/schemas/response/lists_items_schema';
import { Type } from '../../common/schemas/common/schemas';

import { getListItemsByValues } from './get_list_items_by_values';

export const getListItemByValue = async ({
  listId,
  clusterClient,
  listsItemsIndex,
  type,
  value,
}: {
  listId: string;
  clusterClient: Pick<ScopedClusterClient, 'callAsCurrentUser' | 'callAsInternalUser'>;
  listsItemsIndex: string;
  type: Type;
  value: string;
}): Promise<ListsItemsSchema | null> => {
  // TODO: Move this listId.trim() check above here to within the API boundary
  if (listId.trim() === '') {
    return null;
  } else {
    const listItems = await getListItemsByValues({
      listId,
      clusterClient,
      listsItemsIndex,
      type,
      value: [value],
    });
    if (listItems.length) {
      return listItems[0];
    } else {
      return null;
    }
  }
};
