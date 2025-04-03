/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntegrationClient } from './integration_client';
import type { IntegrationsService } from './integrations_service';

const createIntegrationClientMock = () => {
  const mocked: jest.Mocked<IntegrationClient> = {
    list: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  return mocked;
};

const createIntegrationsServiceMock = () => {
  const mocked: jest.Mocked<IntegrationsService> = {
    getScopedClient: jest.fn().mockReturnValue(createIntegrationClientMock()),
    getIntegrationProviders: jest.fn(),
  };
  return mocked;
};

export const integrationMocks = {
  create: createIntegrationsServiceMock,
  createClient: createIntegrationClientMock,
};
