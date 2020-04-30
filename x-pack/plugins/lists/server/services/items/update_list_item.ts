/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CreateDocumentResponse } from 'elasticsearch';
import { APICaller } from 'kibana/server';

import {
  Id,
  ListItemSchema,
  MetaOrUndefined,
  UpdateEsListItemSchema,
} from '../../../common/schemas';
import { transformListItemToElasticQuery } from '../utils';

import { getListItem } from './get_list_item';

export interface UpdateListItemOptions {
  id: Id;
  value: string | null | undefined;
  callCluster: APICaller;
  listItemIndex: string;
  user: string;
  meta: MetaOrUndefined;
  dateNow?: string;
}

export const updateListItem = async ({
  id,
  value,
  callCluster,
  listItemIndex,
  user,
  meta,
  dateNow,
}: UpdateListItemOptions): Promise<ListItemSchema | null> => {
  const updatedAt = dateNow ?? new Date().toISOString();
  const listItem = await getListItem({ callCluster, id, listItemIndex });
  if (listItem == null) {
    return null;
  } else {
    const doc: UpdateEsListItemSchema = {
      meta,
      updated_at: updatedAt,
      updated_by: user,
      ...transformListItemToElasticQuery({ type: listItem.type, value: value ?? listItem.value }),
    };

    const response: CreateDocumentResponse = await callCluster('update', {
      body: {
        doc,
      },
      id: listItem.id,
      index: listItemIndex,
    });
    return {
      created_at: listItem.created_at,
      created_by: listItem.created_by,
      id: response._id,
      list_id: listItem.list_id,
      meta: meta ?? listItem.meta,
      tie_breaker_id: listItem.tie_breaker_id,
      type: listItem.type,
      updated_at: updatedAt,
      updated_by: listItem.updated_by,
      value: value ?? listItem.value,
    };
  }
};
