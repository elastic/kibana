/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { actionsClientMock } from './actions_client.mock';
import { PluginSetupContract, PluginStartContract } from './plugin';
import { Services } from './types';
import {
  elasticsearchServiceMock,
  savedObjectsClientMock,
} from '../../../../src/core/server/mocks';

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
    preconfiguredActions: [],
  };
  return mock;
};

const createServicesMock = () => {
  const mock: jest.Mocked<
    Services & {
      savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
    }
  > = {
    callCluster: elasticsearchServiceMock.createLegacyScopedClusterClient().callAsCurrentUser,
    getLegacyScopedClusterClient: jest.fn(),
    savedObjectsClient: savedObjectsClientMock.create(),
  };
  return mock;
};

export const actionsMock = {
  createServices: createServicesMock,
  createSetup: createSetupMock,
  createStart: createStartMock,
};
