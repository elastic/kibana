/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller } from 'kibana/server';

import { Id, ListSchema } from '../../../common/schemas';

import { getList } from './get_list';

export interface DeleteListOptions {
  id: Id;
  callAsCurrentUser: APICaller;
  listIndex: string;
  listItemIndex: string;
}

export const deleteList = async ({
  id,
  callAsCurrentUser,
  listIndex,
  listItemIndex,
}: DeleteListOptions): Promise<ListSchema | null> => {
  const list = await getList({ callAsCurrentUser, id, listIndex });
  if (list == null) {
    return null;
  } else {
    await callAsCurrentUser('deleteByQuery', {
      body: {
        query: {
          term: {
            list_id: id,
          },
        },
      },
      index: listItemIndex,
    });

    await callAsCurrentUser('delete', {
      id,
      index: listIndex,
    });
    return list;
  }
};
