/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { executeAction } from './executor';
import { KibanaRequest } from '@kbn/core-http-server';
import { RequestBody } from './langchain/types';
import { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
const request = {
  body: {
    params: {},
  },
} as KibanaRequest<unknown, unknown, RequestBody>;

describe('executeAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should execute an action with the provided connectorId and request body params', async () => {
    const actions = {
      getActionsClientWithRequest: jest.fn().mockResolvedValue({
        execute: jest.fn().mockResolvedValue({
          status: 'ok',
          data: {
            message: 'Test message',
          },
        }),
      }),
    } as unknown as ActionsPluginStart;

    const connectorId = '12345';

    const response = await executeAction({ actions, request, connectorId });

    expect(actions.getActionsClientWithRequest).toHaveBeenCalledWith(request);
    expect(actions.getActionsClientWithRequest).toHaveBeenCalledTimes(1);
    expect(response.connector_id).toBe(connectorId);
    expect(response.data).toBe('Test message');
    expect(response.status).toBe('ok');
  });

  it('should throw an error if action result status is "error"', async () => {
    const actions = {
      getActionsClientWithRequest: jest.fn().mockResolvedValue({
        execute: jest.fn().mockResolvedValue({
          status: 'error',
          message: 'Error message',
          serviceMessage: 'Service error message',
        }),
      }),
    } as unknown as ActionsPluginStart;
    const connectorId = '12345';

    await expect(executeAction({ actions, request, connectorId })).rejects.toThrowError(
      'Action result status is error: Error message - Service error message'
    );
  });

  it('should throw an error if content of response data is not a string', async () => {
    const actions = {
      getActionsClientWithRequest: jest.fn().mockResolvedValue({
        execute: jest.fn().mockResolvedValue({
          status: 'ok',
          data: {
            message: 12345,
          },
        }),
      }),
    } as unknown as ActionsPluginStart;
    const connectorId = '12345';

    await expect(executeAction({ actions, request, connectorId })).rejects.toThrowError(
      'Action result status is error: content should be a string, but it had an unexpected type: number'
    );
  });
});
