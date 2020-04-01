/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsContext } from './context';
import { namesMock } from './names.mock';
import { IClusterClientAdapter } from './cluster_client_adapter';
import { loggingServiceMock } from '../../../../../src/core/server/mocks';
import { clusterClientAdapterMock } from './cluster_client_adapter.mock';

const createContextMock = () => {
  const mock: jest.Mocked<EsContext> & {
    esAdapter: jest.Mocked<IClusterClientAdapter>;
  } = {
    logger: loggingServiceMock.createLogger(),
    esNames: namesMock.create(),
    initialize: jest.fn(),
    waitTillReady: jest.fn(),
    esAdapter: clusterClientAdapterMock.create(),
  };
  return mock;
};

export const contextMock = {
  create: createContextMock,
};
