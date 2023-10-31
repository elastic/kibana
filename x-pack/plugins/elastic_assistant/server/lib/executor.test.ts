/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { executeAction, Props } from './executor';
import { PassThrough } from 'stream';

describe('executeAction', () => {
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
    const request = {
      body: {
        params: {
          subActionParams: {},
        },
      },
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
    const request = {
      body: {
        params: {
          subActionParams: {},
        },
      },
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
    const request = {
      body: {
        params: {
          subActionParams: {},
        },
      },
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
    const request = {
      body: {
        params: {
          subActionParams: {},
        },
      },
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
    const request = {
      body: {
        params: {
          subActionParams: {},
        },
      },
    };
    const connectorId = 'testConnectorId';

    try {
      await executeAction({ actions, request, connectorId } as unknown as Props);
    } catch (e) {
      expect(e.message).toBe('Unexpected action result');
    }
  });

  it('should return a StaticResponse object with connector_id, data, and status fields when the response from the actions framework is a string', async () => {
    const actions = {
      getActionsClientWithRequest: jest.fn().mockResolvedValue({
        execute: jest.fn().mockResolvedValue({
          data: {
            message: 'Test message',
          },
        }),
      }),
    };
    const request = {
      body: {
        params: {
          subActionParams: {},
        },
      },
    };
    const connectorId = 'testConnectorId';

    const result = await executeAction({ actions, request, connectorId } as unknown as Props);

    expect(result).toEqual({
      connector_id: connectorId,
      data: 'Test message',
      status: 'ok',
    });
  });
});
