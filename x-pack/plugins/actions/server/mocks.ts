/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionsClientMock } from './actions_client.mock';
import { PluginSetupContract, PluginStartContract, renderActionParameterTemplates } from './plugin';
import { Services } from './types';
import {
  elasticsearchServiceMock,
  savedObjectsClientMock,
} from '../../../../src/core/server/mocks';
import { actionsAuthorizationMock } from './authorization/actions_authorization.mock';
export { actionsAuthorizationMock };
export { actionsClientMock };

const createSetupMock = () => {
  const mock: jest.Mocked<PluginSetupContract> = {
    registerType: jest.fn(),
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
  };
  return mock;
};

export const actionsMock = {
  createServices: createServicesMock,
  createSetup: createSetupMock,
  createStart: createStartMock,
};
