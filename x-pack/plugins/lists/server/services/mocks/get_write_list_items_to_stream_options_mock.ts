/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Stream } from 'stream';

import {
  ExportListItemsToStreamOptions,
  GetResponseOptions,
  WriteNextResponseOptions,
  WriteResponseHitsToStreamOptions,
} from '../items';

import { getDataClientMock } from './get_data_client_mock';
import { LIST_ID, LIST_ITEM_INDEX } from './lists_services_mock_constants';
import { getSearchListItemMock } from './get_search_list_item_mock';

export const getExportListItemsToStreamOptionsMock = (): ExportListItemsToStreamOptions => ({
  dataClient: getDataClientMock(getSearchListItemMock()),
  listId: LIST_ID,
  listItemIndex: LIST_ITEM_INDEX,
  stream: new Stream.PassThrough(),
  stringToAppend: undefined,
});

export const getWriteNextResponseOptions = (): WriteNextResponseOptions => ({
  dataClient: getDataClientMock(getSearchListItemMock()),
  listId: LIST_ID,
  listItemIndex: LIST_ITEM_INDEX,
  searchAfter: [],
  stream: new Stream.PassThrough(),
  stringToAppend: undefined,
});

export const getResponseOptionsMock = (): GetResponseOptions => ({
  dataClient: getDataClientMock(),
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
