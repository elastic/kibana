/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { of } from 'rxjs';
import {
  GlobalSearchPluginSetup,
  GlobalSearchPluginStart,
  RouteHandlerGlobalSearchContext,
} from './types';
import { searchServiceMock } from './services/search_service.mock';
import { contextMock } from './services/context.mock';

const createSetupMock = (): jest.Mocked<GlobalSearchPluginSetup> => {
  const searchMock = searchServiceMock.createSetupContract();

  return {
    registerResultProvider: searchMock.registerResultProvider,
  };
};

const createStartMock = (): jest.Mocked<GlobalSearchPluginStart> => {
  const searchMock = searchServiceMock.createStartContract();

  return {
    find: searchMock.find,
  };
};

const createRouteHandlerContextMock = (): jest.Mocked<RouteHandlerGlobalSearchContext> => {
  const handlerContextMock = {
    find: jest.fn(),
  };

  handlerContextMock.find.mockReturnValue(of([]));

  return handlerContextMock;
};

export const globalSearchPluginMock = {
  createSetupContract: createSetupMock,
  createStartContract: createStartMock,
  createRouteHandlerContext: createRouteHandlerContextMock,
  createProviderContext: contextMock.create,
};
