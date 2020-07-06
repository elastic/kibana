/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller } from 'kibana/server';

import { Id, ListItemSchema } from '../../../common/schemas';

import { getListItem } from '.';

export interface DeleteListItemOptions {
  id: Id;
  callCluster: LegacyAPICaller;
  listItemIndex: string;
}

export const deleteListItem = async ({
  id,
  callCluster,
  listItemIndex,
}: DeleteListItemOptions): Promise<ListItemSchema | null> => {
  const listItem = await getListItem({ callCluster, id, listItemIndex });
  if (listItem == null) {
    return null;
  } else {
    await callCluster('delete', {
      id,
      index: listItemIndex,
    });
  }
  return listItem;
};
