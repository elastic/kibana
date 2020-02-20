/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';
import { loggingServiceMock, httpServiceMock } from '../../../../../../../src/core/server/mocks';
import { CaseService } from '../../../services';
import { authenticationMock } from '../__fixtures__';
import { RouteDeps } from '../index';

export const createRoute = async (
  api: (deps: RouteDeps) => void,
  method: 'get' | 'post' | 'delete' | 'patch',
  badAuth = false
) => {
  const httpService = httpServiceMock.createSetupContract();
  const router = httpService.createRouter('') as jest.Mocked<IRouter>;

  const log = loggingServiceMock.create().get('case');

  const service = new CaseService(log);
  const caseService = await service.setup({
    authentication: badAuth ? authenticationMock.createInvalid() : authenticationMock.create(),
  });

  api({
    router,
    caseService,
  });

  return router[method].mock.calls[0][1];
};
