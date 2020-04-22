/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Id, ListItemSchema } from '../../../common/schemas';
import { DataClient } from '../../types';

import { getListItem } from '.';

export interface DeleteListItemOptions {
  id: Id;
  dataClient: DataClient;
  listItemIndex: string;
}

export const deleteListItem = async ({
  id,
  dataClient,
  listItemIndex,
}: DeleteListItemOptions): Promise<ListItemSchema | null> => {
  const listItem = await getListItem({ dataClient, id, listItemIndex });
  if (listItem == null) {
    return null;
  } else {
    await dataClient.callAsCurrentUser('delete', {
      id,
      index: listItemIndex,
    });
  }
  return listItem;
};
