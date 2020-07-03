/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ListPluginSetup } from './types';
import { getListClientMock } from './services/lists/list_client.mock';
import { getExceptionListClientMock } from './services/exception_lists/exception_list_client.mock';

const createSetupMock = (): jest.Mocked<ListPluginSetup> => {
  const mock: jest.Mocked<ListPluginSetup> = {
    getExceptionListClient: jest.fn().mockReturnValue(getExceptionListClientMock()),
    getListClient: jest.fn().mockReturnValue(getListClientMock()),
  };
  return mock;
};

export const listMock = {
  createSetup: createSetupMock,
  getExceptionListClient: getExceptionListClientMock,
  getListClient: getListClientMock,
};
