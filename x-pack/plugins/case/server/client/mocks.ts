/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'kibana/server';
import { loggingSystemMock } from '../../../../../src/core/server/mocks';
import {
  CaseService,
  CaseConfigureService,
  CaseUserActionServiceSetup,
  ConnectorMappingsService,
} from '../services';
import { CaseClient } from './types';
import { authenticationMock } from '../routes/api/__fixtures__';
import { createCaseClient } from '.';

export type CaseClientMock = jest.Mocked<CaseClient>;
export const createCaseClientMock = (): CaseClientMock => ({
  create: jest.fn(),
  update: jest.fn(),
  addComment: jest.fn(),
});

export const createCaseClientWithMockSavedObjectsClient = async (
  savedObjectsClient: any,
  badAuth: boolean = false
): Promise<{
  client: CaseClient;
  services: { userActionService: jest.Mocked<CaseUserActionServiceSetup> };
}> => {
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

  return {
    client: createCaseClient({
      savedObjectsClient,
      request,
      caseService,
      caseConfigureService,
      connectorMappingsService,
      userActionService,
    }),
    services: { userActionService },
  };
};
