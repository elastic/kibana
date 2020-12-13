/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, RequestHandlerContext } from 'kibana/server';
import { loggingSystemMock, elasticsearchServiceMock } from '../../../../../src/core/server/mocks';
import { actionsClientMock } from '../../../actions/server/mocks';
import {
  CaseService,
  CaseConfigureService,
  CaseUserActionServiceSetup,
  AlertService,
} from '../services';
import { CaseClient } from './types';
import { authenticationMock } from '../routes/api/__fixtures__';
import { createCaseClient } from '.';
import { getActions } from '../routes/api/__mocks__/request_responses';

export type CaseClientMock = jest.Mocked<CaseClient>;
export const createCaseClientMock = (): CaseClientMock => ({
  create: jest.fn(),
  update: jest.fn(),
  addComment: jest.fn(),
  updateAlertsStatus: jest.fn(),
});

export const createCaseClientWithMockSavedObjectsClient = async (
  savedObjectsClient: any,
  badAuth: boolean = false
): Promise<{
  client: CaseClient;
  services: { userActionService: jest.Mocked<CaseUserActionServiceSetup> };
}> => {
  const actionsMock = actionsClientMock.create();
  actionsMock.getAll.mockImplementation(() => Promise.resolve(getActions()));
  const log = loggingSystemMock.create().get('case');
  const esClientMock = elasticsearchServiceMock.createClusterClient();
  const request = {} as KibanaRequest;

  const caseServicePlugin = new CaseService(log);
  const caseConfigureServicePlugin = new CaseConfigureService(log);

  const caseService = await caseServicePlugin.setup({
    authentication: badAuth ? authenticationMock.createInvalid() : authenticationMock.create(),
  });
  const caseConfigureService = await caseConfigureServicePlugin.setup();
  const userActionService = {
    postUserActions: jest.fn(),
    getUserActions: jest.fn(),
  };
  const alertsService = new AlertService();
  alertsService.initialize(esClientMock);

  const context = ({
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
  } as unknown) as RequestHandlerContext;

  const caseClient = createCaseClient({
    savedObjectsClient,
    request,
    caseService,
    caseConfigureService,
    userActionService,
    alertsService,
    context,
  });

  return {
    client: caseClient,
    services: { userActionService },
  };
};
