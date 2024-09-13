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
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
import { loggerMock } from '@kbn/logging-mocks';
import * as ParseStream from './parse_stream';

const onLlmResponse = jest.fn(async () => {}); // We need it to be a promise, or it'll crash because of missing `.catch`
const connectorId = 'testConnectorId';
const mockLogger = loggerMock.create();
const testProps: Omit<Props, 'actions'> = {
  params: {
    subAction: 'invokeAI',
    subActionParams: { messages: [{ content: 'hello', role: 'user' }] },
  },
  actionTypeId: '.bedrock',
  connectorId,
  actionsClient: actionsClientMock.create(),
  onLlmResponse,
  logger: mockLogger,
};

const handleStreamStorageSpy = jest.spyOn(ParseStream, 'handleStreamStorage');

describe('executeAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should execute an action and return a StaticResponse when the response from the actions framework is a string', async () => {
    testProps.actionsClient.execute = jest.fn().mockResolvedValue({
      data: {
        message: 'Test message',
      },
    });

    const result = await executeAction({ ...testProps });

    expect(result).toEqual({
      connector_id: connectorId,
      data: 'Test message',
      status: 'ok',
    });
    expect(onLlmResponse).toHaveBeenCalledWith('Test message');
  });

  it('should execute an action and return a Readable object when the response from the actions framework is a stream', async () => {
    const readableStream = new PassThrough();
    const actionsClient = actionsClientMock.create();
    actionsClient.execute.mockImplementationOnce(
      jest.fn().mockResolvedValue({
        status: 'ok',
        data: readableStream,
      })
    );

    const result = await executeAction({ ...testProps, actionsClient });

    expect(JSON.stringify(result)).toStrictEqual(
      JSON.stringify(readableStream.pipe(new PassThrough()))
    );

    expect(handleStreamStorageSpy).toHaveBeenCalledWith({
      actionTypeId: '.bedrock',
      onMessageSent: onLlmResponse,
      logger: mockLogger,
      responseStream: readableStream,
    });
  });

  it('should throw an error if the actions client fails to execute the action', async () => {
    const actionsClient = actionsClientMock.create();
    actionsClient.execute.mockRejectedValue(new Error('Failed to execute action'));
    testProps.actionsClient = actionsClient;

    await expect(executeAction({ ...testProps, actionsClient })).rejects.toThrowError(
      'Failed to execute action'
    );
  });

  it('should throw an error when the response from the actions framework is null or undefined', async () => {
    const actionsClient = actionsClientMock.create();
    actionsClient.execute.mockImplementationOnce(
      jest.fn().mockResolvedValue({
        data: null,
      })
    );
    testProps.actionsClient = actionsClient;

    try {
      await executeAction({ ...testProps, actionsClient });
    } catch (e) {
      expect(e.message).toBe('Action result status is error: result is not streamable');
    }
  });

  it('should throw an error if action result status is "error"', async () => {
    const actionsClient = actionsClientMock.create();
    actionsClient.execute.mockImplementationOnce(
      jest.fn().mockResolvedValue({
        status: 'error',
        message: 'Error message',
        serviceMessage: 'Service error message',
      })
    );
    testProps.actionsClient = actionsClient;

    await expect(
      executeAction({
        ...testProps,
        actionsClient,
        connectorId: '12345',
      })
    ).rejects.toThrowError('Action result status is error: Error message - Service error message');
  });

  it('should throw an error if content of response data is not a string or streamable', async () => {
    const actionsClient = actionsClientMock.create();
    actionsClient.execute.mockImplementationOnce(
      jest.fn().mockResolvedValue({
        status: 'ok',
        data: {
          message: 12345,
        },
      })
    );
    testProps.actionsClient = actionsClient;

    await expect(
      executeAction({
        ...testProps,

        actionsClient,
        connectorId: '12345',
      })
    ).rejects.toThrowError('Action result status is error: result is not streamable');
  });
});
