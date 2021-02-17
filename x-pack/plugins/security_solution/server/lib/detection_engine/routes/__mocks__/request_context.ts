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
import { alertsClientMock } from '../../../../../../alerts/server/mocks';
import { licensingMock } from '../../../../../../licensing/server/mocks';
import { siemMock } from '../../../../mocks';

const createMockClients = () => ({
  alertsClient: alertsClientMock.create(),
  clusterClient: elasticsearchServiceMock.createLegacyScopedClusterClient(),
  licensing: { license: licensingMock.createLicenseMock() },
  newClusterClient: elasticsearchServiceMock.createScopedClusterClient(),
  savedObjectsClient: savedObjectsClientMock.create(),
  appClient: siemMock.createClient(),
});

const createRequestContextMock = (
  clients: ReturnType<typeof createMockClients> = createMockClients()
) => {
  const coreContext = coreMock.createRequestHandlerContext();
  return ({
    alerting: { getAlertsClient: jest.fn(() => clients.alertsClient) },
    core: {
      ...coreContext,
      elasticsearch: {
        ...coreContext.elasticsearch,
        client: clients.newClusterClient,
        legacy: { ...coreContext.elasticsearch.legacy, client: clients.clusterClient },
      },
      savedObjects: { client: clients.savedObjectsClient },
    },
    licensing: clients.licensing,
    securitySolution: { getAppClient: jest.fn(() => clients.appClient) },
  } as unknown) as SecuritySolutionRequestHandlerContext;
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
