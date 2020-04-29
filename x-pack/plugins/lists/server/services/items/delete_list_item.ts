/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller } from 'kibana/server';

import { Id, ListItemSchema } from '../../../common/schemas';

import { getListItem } from '.';

export interface DeleteListItemOptions {
  id: Id;
  callAsCurrentUser: APICaller;
  listItemIndex: string;
}

export const deleteListItem = async ({
  id,
  callAsCurrentUser,
  listItemIndex,
}: DeleteListItemOptions): Promise<ListItemSchema | null> => {
  const listItem = await getListItem({ callAsCurrentUser, id, listItemIndex });
  if (listItem == null) {
    return null;
  } else {
    await callAsCurrentUser('delete', {
      id,
      index: listItemIndex,
    });
  }
  return listItem;
};
