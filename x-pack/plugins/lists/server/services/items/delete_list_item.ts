/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import type { Id, ListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

import { getListItem } from '.';

export interface DeleteListItemOptions {
  id: Id;
  esClient: ElasticsearchClient;
  listItemIndex: string;
  refresh?: boolean;
}

export const deleteListItem = async ({
  id,
  esClient,
  listItemIndex,
  refresh = false,
}: DeleteListItemOptions): Promise<ListItemSchema | null> => {
  const listItem = await getListItem({ esClient, id, listItemIndex });
  if (listItem == null) {
    return null;
  } else {
    await esClient.deleteByQuery({
      index: listItemIndex,
      query: {
        ids: {
          values: [id],
        },
      },
      refresh,
    });
  }
  return listItem;
};
