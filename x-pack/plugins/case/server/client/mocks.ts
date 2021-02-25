/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, elasticsearchServiceMock } from '../../../../../src/core/server/mocks';
import {
  AlertServiceContract,
  CaseConfigureService,
  CaseService,
  CaseUserActionServiceSetup,
  ConnectorMappingsService,
} from '../services';
import { CaseClient } from './types';
import { authenticationMock } from '../routes/api/__fixtures__';
import { createExternalCaseClient } from '.';

export type CaseClientPluginContractMock = jest.Mocked<CaseClient>;
export const createExternalCaseClientMock = (): CaseClientPluginContractMock => ({
  addComment: jest.fn(),
  create: jest.fn(),
  get: jest.fn(),
  push: jest.fn(),
  getAlerts: jest.fn(),
  getFields: jest.fn(),
  getMappings: jest.fn(),
  getUserActions: jest.fn(),
  update: jest.fn(),
  updateAlertsStatus: jest.fn(),
});

export const createCaseClientWithMockSavedObjectsClient = async ({
  savedObjectsClient,
  badAuth = false,
  omitFromContext = [],
}: {
  savedObjectsClient: any;
  badAuth?: boolean;
  omitFromContext?: string[];
}): Promise<{
  client: CaseClient;
  services: {
    userActionService: jest.Mocked<CaseUserActionServiceSetup>;
    alertsService: jest.Mocked<AlertServiceContract>;
  };
}> => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  // const actionsMock = createActionsClient();
  const log = loggingSystemMock.create().get('case');

  const auth = badAuth ? authenticationMock.createInvalid() : authenticationMock.create();
  const caseService = new CaseService(log, auth);
  const caseConfigureServicePlugin = new CaseConfigureService(log);
  const connectorMappingsServicePlugin = new ConnectorMappingsService(log);

  const caseConfigureService = await caseConfigureServicePlugin.setup();

  const connectorMappingsService = await connectorMappingsServicePlugin.setup();
  const userActionService = {
    getUserActions: jest.fn(),
    postUserActions: jest.fn(),
  };

  const alertsService = {
    initialize: jest.fn(),
    updateAlertsStatus: jest.fn(),
    getAlerts: jest.fn(),
  };

  const caseClient = createExternalCaseClient({
    savedObjectsClient,
    user: auth.getCurrentUser(),
    caseService,
    caseConfigureService,
    connectorMappingsService,
    userActionService,
    alertsService,
    scopedClusterClient: esClient,
  });
  return {
    client: caseClient,
    services: { userActionService, alertsService },
  };
};
