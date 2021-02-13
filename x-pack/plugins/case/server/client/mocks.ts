/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash/fp';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { KibanaRequest, kibanaResponseFactory } from '../../../../../src/core/server/http';
import { loggingSystemMock } from '../../../../../src/core/server/mocks';
import {
  AlertServiceContract,
  CaseConfigureService,
  CaseService,
  CaseUserActionServiceSetup,
  ConnectorMappingsService,
} from '../services';
import { CaseClient } from './types';
import { authenticationMock, createActionsClient } from '../routes/api/__fixtures__';
import { createCaseClient } from '.';
import type { CasesRequestHandlerContext } from '../types';

export type CaseClientMock = jest.Mocked<CaseClient>;
export const createCaseClientMock = (): CaseClientMock => ({
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
  const actionsMock = createActionsClient();
  const log = loggingSystemMock.create().get('case');
  const request = {} as KibanaRequest;
  const response = kibanaResponseFactory;

  const caseServicePlugin = new CaseService(log);
  const caseConfigureServicePlugin = new CaseConfigureService(log);
  const connectorMappingsServicePlugin = new ConnectorMappingsService(log);

  const caseService = await caseServicePlugin.setup({
    authentication: badAuth ? authenticationMock.createInvalid() : authenticationMock.create(),
  });
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

  const context = {
    core: {
      savedObjects: {
        client: savedObjectsClient,
      },
    },
    actions: { getActionsClient: () => actionsMock },
    case: {
      getCaseClient: () => caseClient,
    },
    securitySolution: {
      getAppClient: () => ({
        getSignalsIndex: () => '.siem-signals',
      }),
    },
  };

  const caseClient = createCaseClient({
    savedObjectsClient,
    request,
    response,
    caseService,
    caseConfigureService,
    connectorMappingsService,
    userActionService,
    alertsService,
    context: (omit(omitFromContext, context) as unknown) as CasesRequestHandlerContext,
  });
  return {
    client: caseClient,
    services: { userActionService, alertsService },
  };
};
