/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { executeAction, Props } from './executor';
import { PassThrough } from 'stream';
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
  it('should execute an action and return a StaticResponse when the response from the actions framework is a string', async () => {
    const actions = {
      getActionsClientWithRequest: jest.fn().mockResolvedValue({
        execute: jest.fn().mockResolvedValue({
          data: {
            message: 'Test message',
          },
        }),
      }),
    };
    const connectorId = 'testConnectorId';

    const result = await executeAction({ actions, request, connectorId } as unknown as Props);

    expect(result).toEqual({
      connector_id: connectorId,
      data: 'Test message',
      status: 'ok',
    });
  });

  it('should execute an action and return a Readable object when the response from the actions framework is a stream', async () => {
    const readableStream = new PassThrough();
    const actions = {
      getActionsClientWithRequest: jest.fn().mockResolvedValue({
        execute: jest.fn().mockResolvedValue({
          data: readableStream,
        }),
      }),
    };
    const connectorId = 'testConnectorId';

    const result = await executeAction({ actions, request, connectorId } as unknown as Props);

    expect(JSON.stringify(result)).toStrictEqual(
      JSON.stringify(readableStream.pipe(new PassThrough()))
    );
  });

  it('should throw an error if the actions plugin fails to retrieve the actions client', async () => {
    const actions = {
      getActionsClientWithRequest: jest
        .fn()
        .mockRejectedValue(new Error('Failed to retrieve actions client')),
    };
    const connectorId = 'testConnectorId';

    await expect(
      executeAction({ actions, request, connectorId } as unknown as Props)
    ).rejects.toThrowError('Failed to retrieve actions client');
  });

  it('should throw an error if the actions client fails to execute the action', async () => {
    const actions = {
      getActionsClientWithRequest: jest.fn().mockResolvedValue({
        execute: jest.fn().mockRejectedValue(new Error('Failed to execute action')),
      }),
    };
    const connectorId = 'testConnectorId';

    await expect(
      executeAction({ actions, request, connectorId } as unknown as Props)
    ).rejects.toThrowError('Failed to execute action');
  });

  it('should throw an error when the response from the actions framework is null or undefined', async () => {
    const actions = {
      getActionsClientWithRequest: jest.fn().mockResolvedValue({
        execute: jest.fn().mockResolvedValue({
          data: null,
        }),
      }),
    };
    const connectorId = 'testConnectorId';

    try {
      await executeAction({ actions, request, connectorId } as unknown as Props);
    } catch (e) {
      expect(e.message).toBe('Action result status is error: result is not streamable');
    }
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

  it('should throw an error if content of response data is not a string or streamable', async () => {
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
      'Action result status is error: result is not streamable'
    );
  });
});
