/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CreateMicrosoftDefenderConnectorMockResponse,
  microsoftDefenderEndpointConnectorMocks,
} from './mocks';

describe('Microsoft Defender for Endpoint Connector', () => {
  let connectorMock: CreateMicrosoftDefenderConnectorMockResponse;

  beforeEach(() => {
    connectorMock = microsoftDefenderEndpointConnectorMocks.create();
  });

  describe('Access Token management', () => {
    it('should call API to generate as new token', async () => {
      await connectorMock.instanceMock.isolateHost(
        { id: '1-2-3', comment: 'foo' },
        connectorMock.usageCollector
      );

      expect(connectorMock.instanceMock.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${connectorMock.options.config.oAuthServerUrl}/${connectorMock.options.config.tenantId}/oauth2/v2.0/token`,
          method: 'POST',
          data: {
            grant_type: 'client_credentials',
            client_id: connectorMock.options.config.clientId,
            scope: connectorMock.options.config.oAuthScope,
            client_secret: connectorMock.options.secrets.clientSecret,
          },
        }),
        connectorMock.usageCollector
      );
    });
  });

  describe('#testConnector', () => {
    it('should return expected response', async () => {
      Object.entries(connectorMock.apiMock).forEach(([url, responseFn]) => {
        connectorMock.apiMock[url.replace('1-2-3', 'elastic-connector-test')] = responseFn;
      });

      await expect(
        connectorMock.instanceMock.testConnector({}, connectorMock.usageCollector)
      ).resolves.toEqual({
        results: [
          'API call to Machines API was successful',
          'API call to Machine Isolate was successful',
          'API call to Machine Release was successful',
        ],
      });
    });
  });

  describe('#isolate()', () => {
    it('should call isolate api with comment', async () => {
      await connectorMock.instanceMock.isolateHost(
        { id: '1-2-3', comment: 'foo' },
        connectorMock.usageCollector
      );

      expect(connectorMock.instanceMock.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: expect.stringMatching(/\/api\/machines\/1-2-3\/isolate$/),
          data: { Comment: 'foo', IsolationType: 'Full' },
          headers: { Authorization: 'Bearer eyJN_token_JIE' },
        }),
        connectorMock.usageCollector
      );
    });

    it('should return a Machine Action', async () => {
      await expect(
        connectorMock.instanceMock.isolateHost(
          { id: '1-2-3', comment: 'foo' },
          connectorMock.usageCollector
        )
      ).resolves.toEqual(microsoftDefenderEndpointConnectorMocks.createMachineActionMock());
    });
  });

  describe('#release()', () => {
    it('should call isolate api with comment', async () => {
      await connectorMock.instanceMock.releaseHost(
        { id: '1-2-3', comment: 'foo' },
        connectorMock.usageCollector
      );

      expect(connectorMock.instanceMock.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: expect.stringMatching(/\/api\/machines\/1-2-3\/unisolate$/),
          data: { Comment: 'foo' },
        }),
        connectorMock.usageCollector
      );
    });

    it('should return a machine action object', async () => {
      await expect(
        connectorMock.instanceMock.isolateHost(
          { id: '1-2-3', comment: 'foo' },
          connectorMock.usageCollector
        )
      ).resolves.toEqual(microsoftDefenderEndpointConnectorMocks.createMachineActionMock());
    });
  });
});
