/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ListsSchema } from '../../common/schemas';
import { DataClient } from '../types';

import { getList } from '.';

interface DeleteOptions {
  id: string;
  dataClient: DataClient;
  listsIndex: string;
  listsItemsIndex: string;
}

export const deleteList = async ({
  id,
  dataClient,
  listsIndex,
  listsItemsIndex,
}: DeleteOptions): Promise<ListsSchema | null> => {
  const list = await getList({ id, dataClient, listsIndex });
  if (list == null) {
    return null;
  } else {
    await dataClient.callAsCurrentUser('deleteByQuery', {
      index: listsItemsIndex,
      body: {
        query: {
          term: {
            list_id: id,
          },
        },
      },
    });

    await dataClient.callAsCurrentUser('delete', {
      index: listsIndex,
      id,
    });
    return list;
  }
};
