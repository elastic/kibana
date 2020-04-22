/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EndpointPlugin, EndpointPluginSetupDependencies } from './plugin';
import { coreMock } from '../../../../src/core/server/mocks';
import { PluginSetupContract } from '../../features/server';
import { createMockIngestManagerSetupContract } from './mocks';

describe('test endpoint plugin', () => {
  let plugin: EndpointPlugin;
  let mockCoreSetup: ReturnType<typeof coreMock.createSetup>;
  let mockedEndpointPluginSetupDependencies: jest.Mocked<EndpointPluginSetupDependencies>;
  let mockedPluginSetupContract: jest.Mocked<PluginSetupContract>;
  beforeEach(() => {
    plugin = new EndpointPlugin(
      coreMock.createPluginInitializerContext({
        cookieName: 'sid',
        sessionTimeout: 1500,
      })
    );

    mockCoreSetup = coreMock.createSetup();
    mockedPluginSetupContract = {
      registerFeature: jest.fn(),
      getFeatures: jest.fn(),
      getFeaturesUICapabilities: jest.fn(),
      registerLegacyAPI: jest.fn(),
    };
    mockedEndpointPluginSetupDependencies = {
      features: mockedPluginSetupContract,
      ingestManager: createMockIngestManagerSetupContract(''),
    };
  });

  it('test properly setup plugin', async () => {
    await plugin.setup(mockCoreSetup, mockedEndpointPluginSetupDependencies);
    expect(mockedPluginSetupContract.registerFeature).toBeCalledTimes(1);
    expect(mockCoreSetup.http.createRouter).toBeCalledTimes(1);
  });
});
