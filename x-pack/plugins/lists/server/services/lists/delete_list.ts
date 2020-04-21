/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Id, ListsSchema } from '../../../common/schemas';
import { DataClient } from '../../types';

import { getList } from './get_list';

export interface DeleteListOptions {
  id: Id;
  dataClient: DataClient;
  listIndex: string;
  listItemIndex: string;
}

export const deleteList = async ({
  id,
  dataClient,
  listIndex,
  listItemIndex,
}: DeleteListOptions): Promise<ListsSchema | null> => {
  const list = await getList({ dataClient, id, listIndex });
  if (list == null) {
    return null;
  } else {
    await dataClient.callAsCurrentUser('deleteByQuery', {
      body: {
        query: {
          term: {
            list_id: id,
          },
        },
      },
      index: listItemIndex,
    });

    await dataClient.callAsCurrentUser('delete', {
      id,
      index: listIndex,
    });
    return list;
  }
};
