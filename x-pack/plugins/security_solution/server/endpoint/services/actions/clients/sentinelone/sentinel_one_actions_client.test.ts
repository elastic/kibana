/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResponseActionsClient } from '../lib/types';
import { responseActionsClientMock } from '../lib/mocks';
import type { SentinelOneActionsClientOptions } from '../../..';
import { SentinelOneActionsClient } from '../../..';
import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import { ResponseActionsClientError, ResponseActionsNotSupportedError } from '../errors';
import type { ActionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';

describe('SentinelOneActionsClient class', () => {
  let classConstructorOptions: SentinelOneActionsClientOptions;
  let s1ActionsClient: ResponseActionsClient;
  let connectorActionsMock: ActionsClientMock;

  beforeEach(() => {
    connectorActionsMock = actionsClientMock.create();

    connectorActionsMock.getAll();

    classConstructorOptions = {
      ...responseActionsClientMock.createConstructorOptions(),
      connectorActions: connectorActionsMock,
    };
    s1ActionsClient = new SentinelOneActionsClient(classConstructorOptions);
  });

  it.each([
    'release',
    'killProcess',
    'suspendProcess',
    'runningProcesses',
    'getFile',
    'execute',
    'upload',
  ] as Array<keyof ResponseActionsClient>)(
    'should throw an un-supported error for %s',
    async (methodName) => {
      // @ts-expect-error Purposely passing in empty object for options
      await expect(s1ActionsClient[methodName]({})).rejects.toBeInstanceOf(
        ResponseActionsNotSupportedError
      );
    }
  );

  it('should error if unable to retrieve list of connectors', async () => {
    connectorActionsMock.getAll.mockImplementation(async () => {
      throw new Error('oh oh');
    });
    const responsePromise = s1ActionsClient.isolate(
      responseActionsClientMock.createIsolateOptions()
    );

    await expect(responsePromise).rejects.toBeInstanceOf(ResponseActionsClientError);
    await expect(responsePromise).rejects.toHaveProperty(
      'message',
      expect.stringContaining('Unable to retrieve list of stack connectors:')
    );
    await expect(responsePromise).rejects.toHaveProperty('statusCode', 400);
  });

  it.todo('should error if no connector is defined');

  describe(`#isolate()`, () => {
    it.todo('should send action to sentinelone');

    it.todo('should write action request and response to endpoint indexes');

    it.todo('should return action details');
  });
});
