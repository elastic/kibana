/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, httpServiceMock } from '../../../../../../../src/core/server/mocks';
import { CaseService, CaseConfigureService, ConnectorMappingsService } from '../../../services';
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
  const auth = badAuth ? authenticationMock.createInvalid() : authenticationMock.create();
  const caseService = new CaseService(log, auth);
  const caseConfigureServicePlugin = new CaseConfigureService(log);
  const connectorMappingsServicePlugin = new ConnectorMappingsService(log);
  const caseConfigureService = await caseConfigureServicePlugin.setup();
  const connectorMappingsService = await connectorMappingsServicePlugin.setup();

  api({
    caseConfigureService,
    caseService,
    connectorMappingsService,
    router,
    userActionService: {
      postUserActions: jest.fn(),
      getUserActions: jest.fn(),
    },
  });

  return router[method].mock.calls[0][1];
};
