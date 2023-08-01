/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import type {
  Id,
  ListItemSchema,
  MetaOrUndefined,
  _VersionOrUndefined,
} from '@kbn/securitysolution-io-ts-list-types';
import { encodeHitVersion } from '@kbn/securitysolution-es-utils';

import { transformListItemToElasticQuery } from '../utils';

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
  isPatch?: boolean;
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
  isPatch = false,
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
      const keyValues = Object.entries(elasticQuery).map(([key, keyValue]) => ({
        key,
        value: keyValue,
      }));

      const params = {
        // when assigning undefined in painless, it will remover property and wil set it to null
        // for patch we don't want to remove unspecified value in payload
        assignEmpty: !isPatch,
        keyValues,
        meta,
        updated_at: updatedAt,
        updated_by: user,
      };

      const response = await esClient.updateByQuery({
        conflicts: 'proceed',
        index: listItemIndex,
        query: {
          ids: {
            values: [id],
          },
        },
        refresh: false,
        script: {
          lang: 'painless',
          params,
          source: `
              for (int i; i < params.keyValues.size(); i++) {
                def entry = params.keyValues[i];
                ctx._source[entry.key] = entry.value;
              }
              if (params.assignEmpty == true || params.containsKey('meta')) {
                ctx._source.meta = params.meta;
              }
              ctx._source.updated_at = params.updated_at;
              ctx._source.updated_by = params.updated_by;
          `,
        },
      });
      return {
        '@timestamp': listItem['@timestamp'],
        _version: encodeHitVersion(response),
        created_at: listItem.created_at,
        created_by: listItem.created_by,
        deserializer: listItem.deserializer,
        id,
        list_id: listItem.list_id,
        meta: isPatch ? meta ?? listItem.meta : meta,
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
