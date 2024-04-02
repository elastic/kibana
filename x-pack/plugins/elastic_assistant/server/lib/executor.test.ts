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
import { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { ExecuteConnectorRequestBody } from '@kbn/elastic-assistant-common';
import { loggerMock } from '@kbn/logging-mocks';
const request = {
  body: {
    subAction: 'invokeAI',
    message: 'hello',
  },
} as KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;
const onLlmResponse = jest.fn();
const connectorId = 'testConnectorId';
const mockLogger = loggerMock.create();
const testProps: Omit<Props, 'actions'> = {
  params: {
    subAction: 'invokeAI',
    subActionParams: { messages: [{ content: 'hello', role: 'user' }] },
  },
  actionTypeId: '.bedrock',
  request,
  connectorId,
  onLlmResponse,
  logger: mockLogger,
};

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
    } as unknown as Props['actions'];

    const result = await executeAction({ ...testProps, actions });

    expect(result).toEqual({
      connector_id: connectorId,
      data: 'Test message',
      status: 'ok',
    });
    expect(onLlmResponse).toHaveBeenCalledWith('Test message');
  });

  it('should execute an action and return a Readable object when the response from the actions framework is a stream', async () => {
    const readableStream = new PassThrough();
    const actions = {
      getActionsClientWithRequest: jest.fn().mockResolvedValue({
        execute: jest.fn().mockResolvedValue({
          data: readableStream,
        }),
      }),
    } as unknown as Props['actions'];

    const result = await executeAction({ ...testProps, actions });

    expect(JSON.stringify(result)).toStrictEqual(
      JSON.stringify(readableStream.pipe(new PassThrough()))
    );
  });

  it('should throw an error if the actions plugin fails to retrieve the actions client', async () => {
    const actions = {
      getActionsClientWithRequest: jest
        .fn()
        .mockRejectedValue(new Error('Failed to retrieve actions client')),
    } as unknown as Props['actions'];

    await expect(executeAction({ ...testProps, actions })).rejects.toThrowError(
      'Failed to retrieve actions client'
    );
  });

  it('should throw an error if the actions client fails to execute the action', async () => {
    const actions = {
      getActionsClientWithRequest: jest.fn().mockResolvedValue({
        execute: jest.fn().mockRejectedValue(new Error('Failed to execute action')),
      }),
    } as unknown as Props['actions'];

    await expect(executeAction({ ...testProps, actions })).rejects.toThrowError(
      'Failed to execute action'
    );
  });

  it('should throw an error when the response from the actions framework is null or undefined', async () => {
    const actions = {
      getActionsClientWithRequest: jest.fn().mockResolvedValue({
        execute: jest.fn().mockResolvedValue({
          data: null,
        }),
      }),
    } as unknown as Props['actions'];

    try {
      await executeAction({ ...testProps, actions });
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

    await expect(
      executeAction({
        ...testProps,
        actions,
        connectorId: '12345',
      })
    ).rejects.toThrowError('Action result status is error: Error message - Service error message');
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

    await expect(
      executeAction({
        ...testProps,

        actions,
        connectorId: '12345',
      })
    ).rejects.toThrowError('Action result status is error: result is not streamable');
  });
});
