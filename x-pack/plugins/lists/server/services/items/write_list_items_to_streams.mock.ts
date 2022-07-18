/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Stream } from 'stream';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from '@kbn/core/server/elasticsearch/client/mocks';

import { LIST_ID, LIST_ITEM_INDEX } from '../../../common/constants.mock';
import { getSearchListItemMock } from '../../schemas/elastic_response/search_es_list_item_schema.mock';

import {
  ExportListItemsToStreamOptions,
  GetResponseOptions,
  WriteNextResponseOptions,
  WriteResponseHitsToStreamOptions,
} from '.';

export const getExportListItemsToStreamOptionsMock = (): ExportListItemsToStreamOptions => ({
  esClient: elasticsearchClientMock.createScopedClusterClient().asCurrentUser,
  listId: LIST_ID,
  listItemIndex: LIST_ITEM_INDEX,
  stream: new Stream.PassThrough(),
  stringToAppend: undefined,
});

export const getWriteNextResponseOptions = (): WriteNextResponseOptions => ({
  esClient: elasticsearchClientMock.createScopedClusterClient().asCurrentUser,
  listId: LIST_ID,
  listItemIndex: LIST_ITEM_INDEX,
  searchAfter: [],
  stream: new Stream.PassThrough(),
  stringToAppend: undefined,
});

export const getResponseOptionsMock = (): GetResponseOptions => ({
  esClient: elasticsearchClientMock.createScopedClusterClient().asCurrentUser,
  listId: LIST_ID,
  listItemIndex: LIST_ITEM_INDEX,
  searchAfter: [],
  size: 100,
});

export const getWriteResponseHitsToStreamOptionsMock = (): WriteResponseHitsToStreamOptions => ({
  response: getSearchListItemMock(),
  stream: new Stream.PassThrough(),
  stringToAppend: undefined,
});
