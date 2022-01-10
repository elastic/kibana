/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import type { Id, ListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { createEsClientCallWithHeaders } from '@kbn/securitysolution-utils';

import { getList } from './get_list';

export interface DeleteListOptions {
  id: Id;
  esClient: ElasticsearchClient;
  listIndex: string;
  listItemIndex: string;
}

export const deleteList = async ({
  id,
  esClient,
  listIndex,
  listItemIndex,
}: DeleteListOptions): Promise<ListSchema | null> => {
  const list = await getList({ esClient, id, listIndex });
  if (list == null) {
    return null;
  } else {
    await esClient.deleteByQuery(
      createEsClientCallWithHeaders({
        addOriginHeader: true,
        request: {
          index: listItemIndex,
          query: {
            term: {
              list_id: id,
            },
          },
          refresh: false,
        },
      })
    );

    await esClient.delete(
      createEsClientCallWithHeaders({
        addOriginHeader: true,
        request: {
          id,
          index: listIndex,
          refresh: 'wait_for',
        },
      })
    );
    return list;
  }
};
