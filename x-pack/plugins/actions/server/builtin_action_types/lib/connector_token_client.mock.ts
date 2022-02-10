/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PublicMethodsOf } from '@kbn/utility-types';
import { ConnectorTokenClient } from './connector_token_client';

const createConnectorTokenClientMock = () => {
  const mocked: jest.Mocked<PublicMethodsOf<ConnectorTokenClient>> = {
    create: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
    deleteConnectorTokens: jest.fn(),
  };
  return mocked;
};

export const connectorTokenClientMock = {
  create: createConnectorTokenClientMock,
};
