/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ListPluginSetup } from './types';
import { getListClientMock } from './services/lists/list_client.mock';
import {
  getCreateExceptionListItemOptionsMock,
  getExceptionListClientMock,
} from './services/exception_lists/exception_list_client.mock';

const createSetupMock = (): jest.Mocked<ListPluginSetup> => {
  const mock: jest.Mocked<ListPluginSetup> = {
    getExceptionListClient: jest.fn().mockReturnValue(getExceptionListClientMock()),
    getListClient: jest.fn().mockReturnValue(getListClientMock()),
    registerExtension: jest.fn(),
  };
  return mock;
};

export const listMock = {
  createSetup: createSetupMock,
  getCreateExceptionListItemOptionsMock,
  getExceptionListClient: getExceptionListClientMock,
  getListClient: getListClientMock,
};
