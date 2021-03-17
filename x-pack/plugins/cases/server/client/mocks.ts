/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, KibanaRequest } from 'kibana/server';
import { DeeplyMockedKeys } from 'packages/kbn-utility-types/target/jest';
import {
  loggingSystemMock,
  elasticsearchServiceMock,
  savedObjectsServiceMock,
} from '../../../../../src/core/server/mocks';
import {
  AlertServiceContract,
  CaseConfigureService,
  CaseService,
  CaseUserActionServiceSetup,
  ConnectorMappingsService,
} from '../services';
import { CasesClient } from './types';
import { authenticationMock } from '../routes/api/__fixtures__';
import { featuresPluginMock } from '../../../features/server/mocks';
import { securityMock } from '../../../security/server/mocks';
import { CasesClientFactory } from './factory';

export type CasesClientPluginContractMock = jest.Mocked<CasesClient>;
export const createExternalCasesClientMock = (): CasesClientPluginContractMock => ({
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
  find: jest.fn(),
});

export const createCasesClientWithMockSavedObjectsClient = async ({
  savedObjectsClient,
  badAuth = false,
  omitFromContext = [],
}: {
  savedObjectsClient: any;
  badAuth?: boolean;
  omitFromContext?: string[];
}): Promise<{
  client: CasesClient;
  services: {
    userActionService: jest.Mocked<CaseUserActionServiceSetup>;
    alertsService: jest.Mocked<AlertServiceContract>;
  };
  esClient: DeeplyMockedKeys<ElasticsearchClient>;
}> => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
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

  // since the cases saved objects are hidden we need to use getScopedClient(), we'll just have it return the mock client
  // that is passed in to createRouteContext
  const savedObjectsService = savedObjectsServiceMock.createStartContract();
  savedObjectsService.getScopedClient.mockReturnValue(savedObjectsClient);

  const factory = new CasesClientFactory(log);
  factory.initialize({
    alertsService,
    caseConfigureService,
    caseService,
    connectorMappingsService,
    userActionService,
    featuresPluginStart: featuresPluginMock.createStart(),
    getSpace: async (req: KibanaRequest) => undefined,
    isAuthEnabled: false,
    securityPluginSetup: securityMock.createSetup(),
    securityPluginStart: securityMock.createStart(),
  });

  // create a single reference to the caseClient so we can mock its methods
  const casesClient = await factory.create({
    savedObjectsService,
    // Since authorization is disabled for these unit tests we don't need any information from the request object
    // so just pass in an empty one
    request: {} as KibanaRequest,
    scopedClusterClient: esClient,
  });

  return {
    client: casesClient,
    services: { userActionService, alertsService },
    esClient,
  };
};
