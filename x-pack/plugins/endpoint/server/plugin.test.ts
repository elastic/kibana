/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EndpointPlugin,
  EndpointPluginSetupDependencies,
  EndpointPluginStartDependencies,
} from './plugin';
import { coreMock } from '../../../../src/core/server/mocks';
import { PluginSetupContract } from '../../features/server';
import { createMockIngestManagerStartContract } from './mocks';

describe('test endpoint plugin', () => {
  let plugin: EndpointPlugin;
  let mockCoreSetup: ReturnType<typeof coreMock.createSetup>;
  let mockCoreStart: ReturnType<typeof coreMock.createStart>;
  let mockedEndpointPluginSetupDependencies: jest.Mocked<EndpointPluginSetupDependencies>;
  let mockedEndpointPluginStartDependencies: jest.Mocked<EndpointPluginStartDependencies>;
  let mockedPluginSetupContract: jest.Mocked<PluginSetupContract>;
  beforeEach(() => {
    plugin = new EndpointPlugin(
      coreMock.createPluginInitializerContext({
        cookieName: 'sid',
        sessionTimeout: 1500,
      })
    );

    mockCoreSetup = coreMock.createSetup();
    mockCoreStart = coreMock.createStart();
    mockedPluginSetupContract = {
      registerFeature: jest.fn(),
      getFeatures: jest.fn(),
      getFeaturesUICapabilities: jest.fn(),
      registerLegacyAPI: jest.fn(),
    };
  });

  it('test properly setup plugin', async () => {
    mockedEndpointPluginSetupDependencies = {
      features: mockedPluginSetupContract,
    };
    await plugin.setup(mockCoreSetup, mockedEndpointPluginSetupDependencies);
    expect(mockedPluginSetupContract.registerFeature).toBeCalledTimes(1);
    expect(mockCoreSetup.http.createRouter).toBeCalledTimes(1);
    expect(() => plugin.getEndpointAppContextService().getIndexPatternRetriever()).toThrow(Error);
    expect(() => plugin.getEndpointAppContextService().getAgentService()).toThrow(Error);
  });

  it('test properly start plugin', async () => {
    mockedEndpointPluginStartDependencies = {
      ingestManager: createMockIngestManagerStartContract(''),
    };
    await plugin.start(mockCoreStart, mockedEndpointPluginStartDependencies);
    expect(plugin.getEndpointAppContextService().getAgentService()).toBeTruthy();
    expect(plugin.getEndpointAppContextService().getIndexPatternRetriever()).toBeTruthy();
  });
});
