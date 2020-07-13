/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CreateDocumentResponse } from 'elasticsearch';
import { LegacyAPICaller } from 'kibana/server';

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
  callCluster: LegacyAPICaller;
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
    const elasticQuery = transformListItemToElasticQuery({
      serializer: listItem.serializer,
      type: listItem.type,
      value: value ?? listItem.value,
    });
    if (elasticQuery == null) {
      return null;
    } else {
      const doc: UpdateEsListItemSchema = {
        meta,
        updated_at: updatedAt,
        updated_by: user,
        ...elasticQuery,
      };

      const response = await callCluster<CreateDocumentResponse>('update', {
        body: {
          doc,
        },
        id: listItem.id,
        index: listItemIndex,
        refresh: 'wait_for',
      });
      return {
        created_at: listItem.created_at,
        created_by: listItem.created_by,
        deserializer: listItem.deserializer,
        id: response._id,
        list_id: listItem.list_id,
        meta: meta ?? listItem.meta,
        serializer: listItem.serializer,
        tie_breaker_id: listItem.tie_breaker_id,
        type: listItem.type,
        updated_at: updatedAt,
        updated_by: listItem.updated_by,
        value: value ?? listItem.value,
      };
    }
  }
};
