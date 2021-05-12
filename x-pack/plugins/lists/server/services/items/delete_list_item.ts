/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import { Id } from '@kbn/securitysolution-io-ts-utils';

import { ListItemSchema } from '../../../common/schemas';

import { getListItem } from '.';

export interface DeleteListItemOptions {
  id: Id;
  esClient: ElasticsearchClient;
  listItemIndex: string;
}

export const deleteListItem = async ({
  id,
  esClient,
  listItemIndex,
}: DeleteListItemOptions): Promise<ListItemSchema | null> => {
  const listItem = await getListItem({ esClient, id, listItemIndex });
  if (listItem == null) {
    return null;
  } else {
    await esClient.delete({
      id,
      index: listItemIndex,
      refresh: 'wait_for',
    });
  }
  return listItem;
};
