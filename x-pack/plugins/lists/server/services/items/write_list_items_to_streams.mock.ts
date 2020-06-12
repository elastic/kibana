/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Stream } from 'stream';

import { getSearchListItemMock } from '../../../common/schemas/elastic_response/search_es_list_item_schema.mock';
import { getCallClusterMock } from '../../../common/get_call_cluster.mock';
import {
  ExportListItemsToStreamOptions,
  GetResponseOptions,
  WriteNextResponseOptions,
  WriteResponseHitsToStreamOptions,
} from '../items';
import { LIST_ID, LIST_ITEM_INDEX } from '../../../common/constants.mock';

export const getExportListItemsToStreamOptionsMock = (): ExportListItemsToStreamOptions => ({
  callCluster: getCallClusterMock(getSearchListItemMock()),
  listId: LIST_ID,
  listItemIndex: LIST_ITEM_INDEX,
  stream: new Stream.PassThrough(),
  stringToAppend: undefined,
});

export const getWriteNextResponseOptions = (): WriteNextResponseOptions => ({
  callCluster: getCallClusterMock(getSearchListItemMock()),
  listId: LIST_ID,
  listItemIndex: LIST_ITEM_INDEX,
  searchAfter: [],
  stream: new Stream.PassThrough(),
  stringToAppend: undefined,
});

export const getResponseOptionsMock = (): GetResponseOptions => ({
  callCluster: getCallClusterMock(),
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
