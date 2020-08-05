/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loggingSystemMock, httpServiceMock } from '../../../../../../../src/core/server/mocks';
import { CaseService, CaseConfigureService } from '../../../services';
import { authenticationMock } from '../__fixtures__';
import { RouteDeps } from '../types';

export const createRoute = async (
  api: (deps: RouteDeps) => void,
  method: 'get' | 'post' | 'delete' | 'patch',
  badAuth = false
) => {
  const httpService = httpServiceMock.createSetupContract();
  const router = httpService.createRouter();

  const log = loggingSystemMock.create().get('case');

  const caseServicePlugin = new CaseService(log);
  const caseConfigureServicePlugin = new CaseConfigureService(log);

  const caseService = await caseServicePlugin.setup({
    authentication: badAuth ? authenticationMock.createInvalid() : authenticationMock.create(),
  });
  const caseConfigureService = await caseConfigureServicePlugin.setup();

  api({
    caseConfigureService,
    caseService,
    router,
    userActionService: {
      postUserActions: jest.fn(),
      getUserActions: jest.fn(),
    },
  });

  return router[method].mock.calls[0][1];
};
