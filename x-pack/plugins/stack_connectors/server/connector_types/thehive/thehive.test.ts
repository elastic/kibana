/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TheHiveConnector } from './thehive';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { THEHIVE_CONNECTOR_ID } from '../../../common/thehive/constants';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { TheHiveRunActionResponseSchema } from '../../../common/thehive/schema';

describe('TheHiveConnector', () => {
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

  describe('TheHive', () => {
    const connector = new TheHiveConnector({
      configurationUtilities: actionsConfigMock.create(),
      connector: { id: '1', type: THEHIVE_CONNECTOR_ID },
      config: { url: 'https://example.com/api' },
      secrets: { token: '123' },
      logger: loggingSystemMock.createLogger(),
      services: actionsMock.createServices(),
    });
    beforeEach(() => {
      // @ts-ignore
      connector.request = mockRequest;
      jest.clearAllMocks();
    });
    it('the TheHive API call is successful with correct parameters', async () => {
      const response = await connector.runApi({ body: sampleBody });
      expect(mockRequest).toBeCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith({
        url: 'https://example.com/api',
        method: 'post',
        responseSchema: TheHiveRunActionResponseSchema,
        data: sampleBodyFormatted,
        headers: {
          d3key: '123',
        },
      });
      expect(response).toEqual({ result: 'success' });
    });

    it('errors during API calls are properly handled', async () => {
      // @ts-ignore
      connector.request = mockError;

      await expect(connector.runApi({ body: sampleBody })).rejects.toThrow('API Error');
    });
  });
});
