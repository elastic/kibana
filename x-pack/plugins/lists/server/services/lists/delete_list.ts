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
  callCluster: APICaller;
  listIndex: string;
  listItemIndex: string;
}

export const deleteList = async ({
  id,
  callCluster,
  listIndex,
  listItemIndex,
}: DeleteListOptions): Promise<ListSchema | null> => {
  const list = await getList({ callCluster, id, listIndex });
  if (list == null) {
    return null;
  } else {
    await callCluster('deleteByQuery', {
      body: {
        query: {
          term: {
            list_id: id,
          },
        },
      },
      index: listItemIndex,
    });

    await callCluster('delete', {
      id,
      index: listIndex,
    });
    return list;
  }
};
