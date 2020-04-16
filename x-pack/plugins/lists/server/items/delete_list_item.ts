/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ListsItemsSchema } from '../../common/schemas';
import { DataClient } from '../types';

import { getListItem } from '.';

interface DeleteListItemOptions {
  id: string;
  clusterClient: DataClient;
  listsItemsIndex: string;
}

export const deleteListItem = async ({
  id,
  clusterClient,
  listsItemsIndex,
}: DeleteListItemOptions): Promise<ListsItemsSchema | null> => {
  const listItem = await getListItem({ id, clusterClient, listsItemsIndex });
  if (listItem == null) {
    return null;
  } else {
    await clusterClient.callAsCurrentUser('delete', {
      index: listsItemsIndex,
      id,
    });
  }
  return listItem;
};
