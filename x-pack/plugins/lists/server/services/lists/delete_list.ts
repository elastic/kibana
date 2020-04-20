/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ListsSchema, Id } from '../../../common/schemas';
import { DataClient } from '../../types';

import { getList } from '.';

interface DeleteOptions {
  id: Id;
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
  const list = await getList({ dataClient, id, listsIndex });
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
      index: listsItemsIndex,
    });

    await dataClient.callAsCurrentUser('delete', {
      id,
      index: listsIndex,
    });
    return list;
  }
};
