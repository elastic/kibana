/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import type { Id, ListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { createEsClientCallWithHeaders } from '@kbn/securitysolution-utils';
import type { DeleteByQueryRequest, DeleteRequest } from '@elastic/elasticsearch/api/types';

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
    const [request, options] = createEsClientCallWithHeaders<DeleteByQueryRequest>({
      addOriginHeader: true,
      request: {
        body: {
          query: {
            term: {
              list_id: id,
            },
          },
        },
        index: listItemIndex,
        refresh: false,
      },
    });
    await esClient.deleteByQuery(request, options);

    const [deleteRequest, deleteOptions] = createEsClientCallWithHeaders<DeleteRequest>({
      addOriginHeader: true,
      request: {
        id,
        index: listIndex,
        refresh: 'wait_for',
      },
    });
    await esClient.delete(deleteRequest, deleteOptions);
    return list;
  }
};
