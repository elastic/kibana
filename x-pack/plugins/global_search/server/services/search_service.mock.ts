/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchServiceSetup, SearchServiceStart } from './search_service';
import { of } from 'rxjs';

const createSetupMock = (): jest.Mocked<SearchServiceSetup> => {
  return {
    registerResultProvider: jest.fn(),
  };
};

const createStartMock = (): jest.Mocked<SearchServiceStart> => {
  const mock = {
    find: jest.fn(),
  };
  mock.find.mockReturnValue(of({ results: [] }));

  return mock;
};

export const searchServiceMock = {
  createSetupContract: createSetupMock,
  createStartContract: createStartMock,
};
