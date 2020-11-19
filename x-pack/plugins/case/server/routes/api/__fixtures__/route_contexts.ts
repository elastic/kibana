/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext, KibanaRequest } from 'src/core/server';
import { loggingSystemMock } from 'src/core/server/mocks';
import { actionsClientMock } from '../../../../../actions/server/mocks';
import { createCaseClient } from '../../../client';
import { CaseService, CaseConfigureService } from '../../../services';
import { getActions } from '../__mocks__/request_responses';
import { authenticationMock } from '../__fixtures__';

export const createRouteContext = async (client: any, badAuth = false) => {
  const actionsMock = actionsClientMock.create();
  actionsMock.getAll.mockImplementation(() => Promise.resolve(getActions()));
  const log = loggingSystemMock.create().get('case');

  const caseServicePlugin = new CaseService(log);
  const caseConfigureServicePlugin = new CaseConfigureService(log);

  const caseService = await caseServicePlugin.setup({
    authentication: badAuth ? authenticationMock.createInvalid() : authenticationMock.create(),
  });
  const caseConfigureService = await caseConfigureServicePlugin.setup();
  const caseClient = createCaseClient({
    savedObjectsClient: client,
    request: {} as KibanaRequest,
    caseService,
    caseConfigureService,
    userActionService: {
      postUserActions: jest.fn(),
      getUserActions: jest.fn(),
    },
  });

  return ({
    core: {
      savedObjects: {
        client,
      },
    },
    actions: { getActionsClient: () => actionsMock },
    case: {
      getCaseClient: () => caseClient,
    },
  } as unknown) as RequestHandlerContext;
};
