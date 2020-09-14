/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { savedObjectsClientMock } from 'src/core/server/mocks';

import { getFoundExceptionListSchemaMock } from '../../../common/schemas/response/found_exception_list_schema.mock';
import { getFoundExceptionListItemSchemaMock } from '../../../common/schemas/response/found_exception_list_item_schema.mock';
import { getExceptionListItemSchemaMock } from '../../../common/schemas/response/exception_list_item_schema.mock';
import {
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
}

export const getExceptionListClientMock = (): ExceptionListClient => {
  const mock = new ExceptionListClientMock({
    savedObjectsClient: savedObjectsClientMock.create(),
    user: 'elastic',
  });
  return mock;
};
