/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsServiceMock,
} from 'src/core/server/mocks';

import { KibanaRequest } from 'kibana/server';
import {
  AlertService,
  CaseService,
  CaseConfigureService,
  ConnectorMappingsService,
  CaseUserActionService,
} from '../../../services';
import { authenticationMock } from '../__fixtures__';
import type { CasesRequestHandlerContext } from '../../../types';
import { createActionsClient } from './mock_actions_client';
import { featuresPluginMock } from '../../../../../features/server/mocks';
import { securityMock } from '../../../../../security/server/mocks';
import { CasesClientFactory } from '../../../client/factory';
import { xpackMocks } from '../../../../../../mocks';

export const createRouteContext = async (client: any, badAuth = false) => {
  const actionsMock = createActionsClient();

  const log = loggingSystemMock.create().get('case');
  const esClient = elasticsearchServiceMock.createElasticsearchClient();

  const authc = badAuth ? authenticationMock.createInvalid() : authenticationMock.create();

  const caseService = new CaseService(log, authc);
  const caseConfigureServicePlugin = new CaseConfigureService(log);
  const connectorMappingsServicePlugin = new ConnectorMappingsService(log);
  const caseUserActionsServicePlugin = new CaseUserActionService(log);

  const connectorMappingsService = await connectorMappingsServicePlugin.setup();
  const caseConfigureService = await caseConfigureServicePlugin.setup();
  const userActionService = await caseUserActionsServicePlugin.setup();
  const alertsService = new AlertService();

  // since the cases saved objects are hidden we need to use getScopedClient(), we'll just have it return the mock client
  // that is passed in to createRouteContext
  const savedObjectsService = savedObjectsServiceMock.createStartContract();
  savedObjectsService.getScopedClient.mockReturnValue(client);

  const contextMock = xpackMocks.createRequestHandlerContext();
  // The tests check the calls on the saved object client, so we need to make sure it is the same one returned by
  // getScopedClient and .client
  contextMock.core.savedObjects.getClient = jest.fn(() => client);
  contextMock.core.savedObjects.client = client;

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
  const caseClient = await factory.create({
    savedObjectsService,
    // Since authorization is disabled for these unit tests we don't need any information from the request object
    // so just pass in an empty one
    request: {} as KibanaRequest,
    scopedClusterClient: esClient,
  });

  const context = ({
    ...contextMock,
    actions: { getActionsClient: () => actionsMock },
    cases: {
      getCasesClient: async () => caseClient,
    },
  } as unknown) as CasesRequestHandlerContext;

  return { context, services: { userActionService } };
};
