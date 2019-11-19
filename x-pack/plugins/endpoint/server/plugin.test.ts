/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CoreSetup, IClusterClient } from 'kibana/server';
import { coreMock, elasticsearchServiceMock } from '../../../../src/core/server/mocks';
import { EndpointPlugin } from './plugin';

describe('Test Endpoint Plugin', () => {
  let plugin: EndpointPlugin;
  let mockCoreSetup: MockedKeys<CoreSetup>;
  let mockClusterClient: jest.Mocked<IClusterClient>;
  beforeEach(() => {
    plugin = new EndpointPlugin(
      coreMock.createPluginInitializerContext({
        cookieName: 'sid',
        sessionTimeout: 1500,
      })
    );

    mockCoreSetup = coreMock.createSetup();
    mockCoreSetup.http.isTlsEnabled = true;

    mockClusterClient = elasticsearchServiceMock.createClusterClient();
    mockCoreSetup.elasticsearch.createClient.mockReturnValue(
      (mockClusterClient as unknown) as jest.Mocked<IClusterClient>
    );
  });
  describe('test setup()', () => {
    it('test properly create plugin', async () => {
      await plugin.setup(mockCoreSetup, {});
      expect(mockCoreSetup.http.registerRouteHandlerContext).toHaveBeenCalledTimes(1);
      expect(mockCoreSetup.http.registerRouteHandlerContext).toBeCalledWith(
        'endpointPlugin',
        expect.any(Function)
      );
      expect(mockCoreSetup.elasticsearch.createClient).toHaveBeenCalledTimes(1);
      expect(mockCoreSetup.elasticsearch.createClient).toHaveBeenCalledWith('endpoint-plugin');
    });
  });
});
