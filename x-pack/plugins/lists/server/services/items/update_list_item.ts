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

import {
  checkVersionConflict,
  transformListItemToElasticQuery,
  waitUntilDocumentIndexed,
} from '../utils';

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
  refresh?: boolean;
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
  refresh = false,
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
      checkVersionConflict(_version, listItem._version);
      const keyValues = Object.entries(elasticQuery).map(([key, keyValue]) => ({
        key,
        value: keyValue,
      }));

      const params = {
        // when assigning undefined in painless, it will remove property and wil set it to null
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
        refresh,
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
              // needed for list items that were created before migration to data streams
              if (ctx._source.containsKey('@timestamp') == false) {
                ctx._source['@timestamp'] = ctx._source.created_at;
              }
          `,
        },
      });

      let updatedOCCVersion: string | undefined;
      if (response.updated) {
        const checkIfListUpdated = async (): Promise<void> => {
          const updatedListItem = await getListItem({ esClient, id, listItemIndex });
          if (updatedListItem?._version === listItem._version) {
            throw Error('List item has not been re-indexed in time');
          }
          updatedOCCVersion = updatedListItem?._version;
        };

        await waitUntilDocumentIndexed(checkIfListUpdated);
      } else {
        throw Error('No list item has been updated');
      }

      return {
        '@timestamp': listItem['@timestamp'],
        _version: updatedOCCVersion,
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
