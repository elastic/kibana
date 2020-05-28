/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { savedObjectsClientMock } from 'src/core/server/mocks';

import { ExceptionListClient } from './exception_list_client';

export class ExceptionListClientMock extends ExceptionListClient {
  public getExceptionList = jest.fn().mockResolvedValue(null);
  // TODO: Finish here
}

export const getExceptionListClientMock = (): ExceptionListClient => {
  const mock = new ExceptionListClientMock({
    savedObjectsClient: savedObjectsClientMock.create(),
    user: 'elastic',
  });
  return mock;
};
