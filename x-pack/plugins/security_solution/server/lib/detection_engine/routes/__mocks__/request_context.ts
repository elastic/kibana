/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecuritySolutionRequestHandlerContext } from '../../../../types';
import {
  coreMock,
  elasticsearchServiceMock,
  savedObjectsClientMock,
} from '../../../../../../../../src/core/server/mocks';
import { alertsClientMock } from '../../../../../../alerting/server/mocks';
import { licensingMock } from '../../../../../../licensing/server/mocks';
import { siemMock } from '../../../../mocks';

const createMockClients = () => ({
  alertsClient: alertsClientMock.create(),
  licensing: { license: licensingMock.createLicenseMock() },
  clusterClient: elasticsearchServiceMock.createScopedClusterClient(),
  savedObjectsClient: savedObjectsClientMock.create(),
  appClient: siemMock.createClient(),
});

/**
 * Adds mocking to the interface so we don't have to cast everywhere
 */
type SecuritySolutionRequestHandlerContextMock = SecuritySolutionRequestHandlerContext & {
  core: {
    elasticsearch: {
      client: {
        asCurrentUser: {
          updateByQuery: jest.Mock;
          search: jest.Mock;
          transport: {
            request: jest.Mock;
          };
        };
      };
    };
  };
};

const createRequestContextMock = (
  clients: ReturnType<typeof createMockClients> = createMockClients()
): SecuritySolutionRequestHandlerContextMock => {
  const coreContext = coreMock.createRequestHandlerContext();
  return ({
    alerting: { getAlertsClient: jest.fn(() => clients.alertsClient) },
    core: {
      ...coreContext,
      elasticsearch: {
        ...coreContext.elasticsearch,
        client: clients.clusterClient,
      },
      savedObjects: { client: clients.savedObjectsClient },
    },
    licensing: clients.licensing,
    securitySolution: { getAppClient: jest.fn(() => clients.appClient) },
  } as unknown) as SecuritySolutionRequestHandlerContextMock;
};

const createTools = () => {
  const clients = createMockClients();
  const context = createRequestContextMock(clients);

  return { clients, context };
};

export const requestContextMock = {
  create: createRequestContextMock,
  createMockClients,
  createTools,
};
