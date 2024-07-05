/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { D3SecurityConnector } from './d3security';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { D3_SECURITY_CONNECTOR_ID } from '../../../common/d3security/constants';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { D3SecurityRunActionResponseSchema } from '../../../common/d3security/schema';
import { ConnectorMetricsService } from '@kbn/actions-plugin/server/lib';

describe('D3SecurityConnector', () => {
  const sampleBody = JSON.stringify({
    cool: 'body',
  });
  const sampleBodyFormatted = JSON.stringify({
    hits: {
      hits: {
        _source: { rawData: { cool: 'body' }, 'event.type': '', 'kibana.alert.severity': '' },
      },
    },
  });
  const mockResponse = { data: { result: 'success' } };
  const mockRequest = jest.fn().mockResolvedValue(mockResponse);
  const mockError = jest.fn().mockImplementation(() => {
    throw new Error('API Error');
  });

  describe('D3 Security', () => {
    const connector = new D3SecurityConnector({
      configurationUtilities: actionsConfigMock.create(),
      connector: { id: '1', type: D3_SECURITY_CONNECTOR_ID },
      config: { url: 'https://example.com/api' },
      secrets: { token: '123' },
      logger: loggingSystemMock.createLogger(),
      services: actionsMock.createServices(),
    });
    let connectorMetricsService: ConnectorMetricsService;

    beforeEach(() => {
      // @ts-ignore
      connector.request = mockRequest;
      jest.clearAllMocks();
      connectorMetricsService = new ConnectorMetricsService();
    });
    it('the D3 Security API call is successful with correct parameters', async () => {
      const response = await connector.runApi({ body: sampleBody }, connectorMetricsService);
      expect(mockRequest).toBeCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith(
        {
          url: 'https://example.com/api',
          method: 'post',
          responseSchema: D3SecurityRunActionResponseSchema,
          data: sampleBodyFormatted,
          headers: {
            d3key: '123',
          },
        },
        connectorMetricsService
      );
      expect(response).toEqual({ result: 'success' });
    });

    it('errors during API calls are properly handled', async () => {
      // @ts-ignore
      connector.request = mockError;

      await expect(connector.runApi({ body: sampleBody }, connectorMetricsService)).rejects.toThrow(
        'API Error'
      );
    });
  });
});
