/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash/fp';
import { KibanaRequest, RequestHandlerContext } from 'kibana/server';
import { loggingSystemMock } from '../../../../../src/core/server/mocks';
import { actionsClientMock } from '../../../actions/server/mocks';
import {
  AlertServiceContract,
  CaseConfigureService,
  CaseService,
  CaseUserActionServiceSetup,
  ConnectorMappingsService,
} from '../services';
import { CaseClient } from './types';
import { authenticationMock } from '../routes/api/__fixtures__';
import { createCaseClient } from '.';
import { getActions } from '../routes/api/__mocks__/request_responses';

export type CaseClientMock = jest.Mocked<CaseClient>;
export const createCaseClientMock = (): CaseClientMock => ({
  addComment: jest.fn(),
  create: jest.fn(),
  getFields: jest.fn(),
  getMappings: jest.fn(),
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
  const actionsMock = actionsClientMock.create();
  actionsMock.getAll.mockImplementation(() => Promise.resolve(getActions()));
  const log = loggingSystemMock.create().get('case');
  const request = {} as KibanaRequest;

  const caseServicePlugin = new CaseService(log);
  const caseConfigureServicePlugin = new CaseConfigureService(log);
  const connectorMappingsServicePlugin = new ConnectorMappingsService(log);

  const caseService = await caseServicePlugin.setup({
    authentication: badAuth ? authenticationMock.createInvalid() : authenticationMock.create(),
  });
  const caseConfigureService = await caseConfigureServicePlugin.setup();

  const connectorMappingsService = await connectorMappingsServicePlugin.setup();
  const userActionService = {
    postUserActions: jest.fn(),
    getUserActions: jest.fn(),
  };

  const alertsService = { initialize: jest.fn(), updateAlertsStatus: jest.fn() };

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
    caseService,
    caseConfigureService,
    connectorMappingsService,
    userActionService,
    alertsService,
    context: (omit(omitFromContext, context) as unknown) as RequestHandlerContext,
  });
  return {
    client: caseClient,
    services: { userActionService, alertsService },
  };
};
