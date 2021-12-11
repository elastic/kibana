/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';

import { getFoundListItemSchemaMock } from '../../../common/schemas/response/found_list_item_schema.mock';
import { getFoundListSchemaMock } from '../../../common/schemas/response/found_list_schema.mock';
import { getListItemResponseMock } from '../../../common/schemas/response/list_item_schema.mock';
import { getListResponseMock } from '../../../common/schemas/response/list_schema.mock';
import {
  IMPORT_BUFFER_SIZE,
  IMPORT_TIMEOUT,
  LIST_INDEX,
  LIST_ITEM_INDEX,
  MAX_IMPORT_PAYLOAD_BYTES,
  MAX_IMPORT_SIZE,
} from '../../../common/constants.mock';

import { ListClient } from './list_client';

export class ListClientMock extends ListClient {
  public getListIndex = jest.fn().mockReturnValue(LIST_INDEX);
  public getListItemIndex = jest.fn().mockReturnValue(LIST_ITEM_INDEX);
  public getList = jest.fn().mockResolvedValue(getListResponseMock());
  public createList = jest.fn().mockResolvedValue(getListResponseMock());
  public createListIfItDoesNotExist = jest.fn().mockResolvedValue(getListResponseMock());
  public getListIndexExists = jest.fn().mockResolvedValue(true);
  public getListItemIndexExists = jest.fn().mockResolvedValue(true);
  public createListBootStrapIndex = jest.fn().mockResolvedValue({});
  public createListItemBootStrapIndex = jest.fn().mockResolvedValue({});
  public getListPolicyExists = jest.fn().mockResolvedValue(true);
  public getListItemPolicyExists = jest.fn().mockResolvedValue(true);
  public getListTemplateExists = jest.fn().mockResolvedValue(true);
  public getListItemTemplateExists = jest.fn().mockResolvedValue(true);
  public getListTemplate = jest.fn().mockResolvedValue({});
  public getListItemTemplate = jest.fn().mockResolvedValue({});
  public setListTemplate = jest.fn().mockResolvedValue({});
  public setListItemTemplate = jest.fn().mockResolvedValue({});
  public setListPolicy = jest.fn().mockResolvedValue({});
  public setListItemPolicy = jest.fn().mockResolvedValue({});
  public deleteListIndex = jest.fn().mockResolvedValue(true);
  public deleteListItemIndex = jest.fn().mockResolvedValue(true);
  public deleteListPolicy = jest.fn().mockResolvedValue({});
  public deleteListItemPolicy = jest.fn().mockResolvedValue({});
  public deleteListTemplate = jest.fn().mockResolvedValue({});
  public deleteListItemTemplate = jest.fn().mockResolvedValue({});
  public deleteListItem = jest.fn().mockResolvedValue(getListItemResponseMock());
  public deleteListItemByValue = jest.fn().mockResolvedValue(getListItemResponseMock());
  public deleteList = jest.fn().mockResolvedValue(getListResponseMock());
  public exportListItemsToStream = jest.fn().mockResolvedValue(undefined);
  public importListItemsToStream = jest.fn().mockResolvedValue(undefined);
  public getListItemByValue = jest.fn().mockResolvedValue([getListItemResponseMock()]);
  public createListItem = jest.fn().mockResolvedValue(getListItemResponseMock());
  public updateListItem = jest.fn().mockResolvedValue(getListItemResponseMock());
  public updateList = jest.fn().mockResolvedValue(getListResponseMock());
  public getListItem = jest.fn().mockResolvedValue(getListItemResponseMock());
  public getListItemByValues = jest.fn().mockResolvedValue([getListItemResponseMock()]);
  public findList = jest.fn().mockResolvedValue(getFoundListSchemaMock());
  public findListItem = jest.fn().mockResolvedValue(getFoundListItemSchemaMock());
}

export const getListClientMock = (): ListClient => {
  const mock = new ListClientMock({
    config: {
      importBufferSize: IMPORT_BUFFER_SIZE,
      importTimeout: IMPORT_TIMEOUT,
      listIndex: LIST_INDEX,
      listItemIndex: LIST_ITEM_INDEX,
      maxExceptionsImportSize: MAX_IMPORT_SIZE,
      maxImportPayloadBytes: MAX_IMPORT_PAYLOAD_BYTES,
    },
    esClient: elasticsearchClientMock.createScopedClusterClient().asCurrentUser,
    spaceId: 'default',
    user: 'elastic',
  });
  return mock;
};
