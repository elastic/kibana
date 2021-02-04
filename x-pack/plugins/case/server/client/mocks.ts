/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'kibana/server';
// TODO: fix this
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { legacyClientMock } from 'src/core/server/elasticsearch/legacy/mocks';
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
import { createExternalCaseClient } from '.';
import { getActions } from '../routes/api/__mocks__/request_responses';

export type CaseClientPluginContractMock = jest.Mocked<CaseClient>;
export const createExternalCaseClientMock = (): CaseClientPluginContractMock => ({
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
  const esLegacyCluster = legacyClientMock.createScopedClusterClient();
  const actionsMock = actionsClientMock.create();
  actionsMock.getAll.mockImplementation(() => Promise.resolve(getActions()));
  const log = loggingSystemMock.create().get('case');
  const request = {} as KibanaRequest;

  const auth = badAuth ? authenticationMock.createInvalid() : authenticationMock.create();
  const caseService = new CaseService(log, auth);
  const caseConfigureServicePlugin = new CaseConfigureService(log);
  const connectorMappingsServicePlugin = new ConnectorMappingsService(log);

  const caseConfigureService = await caseConfigureServicePlugin.setup();

  const connectorMappingsService = await connectorMappingsServicePlugin.setup();
  const userActionService = {
    postUserActions: jest.fn(),
    getUserActions: jest.fn(),
  };

  const alertsService = { initialize: jest.fn(), updateAlertsStatus: jest.fn() };

  const caseClient = createExternalCaseClient({
    savedObjectsClient,
    request,
    caseService,
    caseConfigureService,
    connectorMappingsService,
    userActionService,
    alertsService,
    callCluster: esLegacyCluster.callAsCurrentUser,
  });
  return {
    client: caseClient,
    services: { userActionService, alertsService },
  };
};
