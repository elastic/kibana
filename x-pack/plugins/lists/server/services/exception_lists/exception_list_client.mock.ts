/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from 'src/core/server/mocks';

import { getFoundExceptionListSchemaMock } from '../../../common/schemas/response/found_exception_list_schema.mock';
import { getFoundExceptionListItemSchemaMock } from '../../../common/schemas/response/found_exception_list_item_schema.mock';
import { getExceptionListItemSchemaMock } from '../../../common/schemas/response/exception_list_item_schema.mock';
import {
  getDetectionsExceptionListSchemaMock,
  getExceptionListSchemaMock,
  getTrustedAppsListSchemaMock,
} from '../../../common/schemas/response/exception_list_schema.mock';

import { ExceptionListClient } from './exception_list_client';

export class ExceptionListClientMock extends ExceptionListClient {
  public getExceptionList = jest.fn().mockResolvedValue(getExceptionListSchemaMock());
  public getExceptionListItem = jest.fn().mockResolvedValue(getExceptionListItemSchemaMock());
  public createExceptionList = jest.fn().mockResolvedValue(getExceptionListSchemaMock());
  public updateExceptionList = jest.fn().mockResolvedValue(getExceptionListSchemaMock());
  public deleteExceptionList = jest.fn().mockResolvedValue(getExceptionListSchemaMock());
  public createExceptionListItem = jest.fn().mockResolvedValue(getExceptionListItemSchemaMock());
  public updateExceptionListItem = jest.fn().mockResolvedValue(getExceptionListItemSchemaMock());
  public deleteExceptionListItem = jest.fn().mockResolvedValue(getExceptionListItemSchemaMock());
  public findExceptionListItem = jest.fn().mockResolvedValue(getFoundExceptionListItemSchemaMock());
  public findExceptionList = jest.fn().mockResolvedValue(getFoundExceptionListSchemaMock());
  public createTrustedAppsList = jest.fn().mockResolvedValue(getTrustedAppsListSchemaMock());
  public createEndpointList = jest.fn().mockResolvedValue(getExceptionListSchemaMock());
  public exportExceptionListAndItems = jest.fn().mockResolvedValue({
    exportData: `${JSON.stringify(getDetectionsExceptionListSchemaMock())}\n${JSON.stringify(
      getExceptionListItemSchemaMock({ list_id: 'exception_list_id' })
    )}`,
    exportDetails: {
      exported_exception_list_count: 1,
      exported_exception_list_item_count: 1,
      missing_exception_list_item_count: 0,
      missing_exception_list_items: [],
      missing_exception_lists: [],
      missing_exception_lists_count: 0,
    },
  });
}

export const getExceptionListClientMock = (
  savedObject?: ReturnType<typeof savedObjectsClientMock.create>
): ExceptionListClient => {
  const mock = new ExceptionListClientMock({
    savedObjectsClient: savedObject ? savedObject : savedObjectsClientMock.create(),
    user: 'elastic',
  });
  return mock;
};
