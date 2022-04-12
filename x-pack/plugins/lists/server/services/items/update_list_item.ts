/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import type {
  Id,
  ListItemSchema,
  MetaOrUndefined,
  _VersionOrUndefined,
} from '@kbn/securitysolution-io-ts-list-types';
import { decodeVersion, encodeHitVersion } from '@kbn/securitysolution-es-utils';

import { transformListItemToElasticQuery } from '../utils';
import { UpdateEsListItemSchema } from '../../schemas/elastic_query';

import { getListItem } from './get_list_item';

export interface UpdateListItemOptions {
  _version: _VersionOrUndefined;
  id: Id;
  value: string | null | undefined;
  esClient: ElasticsearchClient;
  listItemIndex: string;
  user: string;
  meta: MetaOrUndefined;
  dateNow?: string;
}

export const updateListItem = async ({
  _version,
  id,
  value,
  esClient,
  listItemIndex,
  user,
  meta,
  dateNow,
}: UpdateListItemOptions): Promise<ListItemSchema | null> => {
  const updatedAt = dateNow ?? new Date().toISOString();
  const listItem = await getListItem({ esClient, id, listItemIndex });
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

      const response = await esClient.update({
        ...decodeVersion(_version),
        body: {
          doc,
        },
        id: listItem.id,
        index: listItemIndex,
        refresh: 'wait_for',
      });
      return {
        _version: encodeHitVersion(response),
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
