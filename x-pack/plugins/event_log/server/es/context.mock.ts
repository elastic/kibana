/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsContext } from './context';
import { namesMock } from './names.mock';
import { loggingServiceMock } from '../../../../../src/core/server/mocks';

const createContextMock = () => {
  const mock: jest.Mocked<EsContext> = {
    logger: loggingServiceMock.createLogger(),
    esNames: namesMock.create(),
    initialize: jest.fn(),
    waitTillReady: jest.fn(),
    callEs: jest.fn(),
  };
  return mock;
};

export const contextMock = {
  create: createContextMock,
};
