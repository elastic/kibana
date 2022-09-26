/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { Logger } from '@kbn/core/server';
import { actionsClientMock } from './actions_client.mock';
import { PluginSetupContract, PluginStartContract, renderActionParameterTemplates } from './plugin';
import { Services } from './types';
import { actionsAuthorizationMock } from './authorization/actions_authorization.mock';
import { ConnectorTokenClient } from './lib/connector_token_client';
export { actionsAuthorizationMock };
export { actionsClientMock };
const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

const createSetupMock = () => {
  const mock: jest.Mocked<PluginSetupContract> = {
    registerType: jest.fn(),
    registerSubActionConnectorType: jest.fn(),
    isPreconfiguredConnector: jest.fn(),
    getSubActionConnectorClass: jest.fn(),
    getCaseConnectorClass: jest.fn(),
    getActionsHealth: jest.fn(),
  };
  return mock;
};

const createStartMock = () => {
  const mock: jest.Mocked<PluginStartContract> = {
    isActionTypeEnabled: jest.fn(),
    isActionExecutable: jest.fn(),
    getActionsClientWithRequest: jest.fn().mockResolvedValue(actionsClientMock.create()),
    getActionsAuthorizationWithRequest: jest
      .fn()
      .mockReturnValue(actionsAuthorizationMock.create()),
    preconfiguredActions: [],
    renderActionParameterTemplates: jest.fn(),
  };
  return mock;
};

// this is a default renderer that escapes nothing
export function renderActionParameterTemplatesDefault<RecordType>(
  actionTypeId: string,
  actionId: string,
  params: Record<string, unknown>,
  variables: Record<string, unknown>
) {
  return renderActionParameterTemplates(undefined, actionTypeId, actionId, params, variables);
}

const createServicesMock = () => {
  const mock: jest.Mocked<
    Services & {
      savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
    }
  > = {
    savedObjectsClient: savedObjectsClientMock.create(),
    scopedClusterClient: elasticsearchServiceMock.createScopedClusterClient().asCurrentUser,
    connectorTokenClient: new ConnectorTokenClient({
      unsecuredSavedObjectsClient: savedObjectsClientMock.create(),
      encryptedSavedObjectsClient: encryptedSavedObjectsMock.createClient(),
      logger,
    }),
  };
  return mock;
};

export const actionsMock = {
  createServices: createServicesMock,
  createSetup: createSetupMock,
  createStart: createStartMock,
};
