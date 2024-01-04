/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResponseActionsClient } from '../lib/types';
import { responseActionsClientMock } from '../mocks';
import type { SentinelOneActionsClientOptions } from '../../..';
import { SentinelOneActionsClient } from '../../..';
import { getActionDetailsById as _getActionDetailsById } from '../../action_details_by_id';
import { ResponseActionsClientError, ResponseActionsNotSupportedError } from '../errors';
import type { ActionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';

jest.mock('../../action_details_by_id', () => {
  const originalMod = jest.requireActual('../../action_details_by_id');

  return {
    ...originalMod,
    getActionDetailsById: jest.fn(originalMod.getActionDetailsById),
  };
});

const getActionDetailsByIdMock = _getActionDetailsById as jest.Mock;

describe('SentinelOneActionsClient class', () => {
  let classConstructorOptions: SentinelOneActionsClientOptions;
  let s1ActionsClient: ResponseActionsClient;
  let connectorActionsMock: ActionsClientMock;

  const createS1IsolateOptions = () =>
    responseActionsClientMock.createIsolateOptions({ agent_type: 'sentinel_one' });

  beforeEach(() => {
    connectorActionsMock = responseActionsClientMock.createConnectorActionsClient();

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
    const responsePromise = s1ActionsClient.isolate(createS1IsolateOptions());

    await expect(responsePromise).rejects.toBeInstanceOf(ResponseActionsClientError);
    await expect(responsePromise).rejects.toHaveProperty(
      'message',
      expect.stringContaining('Unable to retrieve list of stack connectors:')
    );
    await expect(responsePromise).rejects.toHaveProperty('statusCode', 400);
  });

  it('should error if retrieving connectors fails', async () => {
    (connectorActionsMock.getAll as jest.Mock).mockImplementation(async () => {
      throw new Error('oh oh');
    });

    await expect(s1ActionsClient.isolate(createS1IsolateOptions())).rejects.toMatchObject({
      message: `Unable to retrieve list of stack connectors: oh oh`,
      statusCode: 400,
    });
  });

  it.each([
    ['no connector defined', async () => []],
    [
      'deprecated connector',
      async () => [responseActionsClientMock.createConnector({ isDeprecated: true })],
    ],
    [
      'missing secrets',
      async () => [responseActionsClientMock.createConnector({ isMissingSecrets: true })],
    ],
  ])('should error if: %s', async (_, getAllImplementation) => {
    (connectorActionsMock.getAll as jest.Mock).mockImplementation(getAllImplementation);

    await expect(s1ActionsClient.isolate(createS1IsolateOptions())).rejects.toMatchObject({
      message: `No SentinelOne stack connector found`,
      statusCode: 400,
    });
  });

  it('should error if multiple agent ids are received', async () => {
    const payload = createS1IsolateOptions();
    payload.endpoint_ids.push('second-host-id');

    await expect(s1ActionsClient.isolate(payload)).rejects.toMatchObject({
      message: `[body.endpoint_ids]: Multiple agents IDs not currently supported for SentinelOne`,
      statusCode: 400,
    });
  });

  describe(`#isolate()`, () => {
    it('should send action to sentinelone', async () => {
      await s1ActionsClient.isolate(createS1IsolateOptions());

      expect(connectorActionsMock.execute as jest.Mock).toHaveBeenCalledWith({
        actionId: 's1-connector-instance-id',
        params: {
          subAction: 'isolateHost',
          subActionParams: {
            uuid: '1-2-3',
          },
        },
      });
    });

    it('should write action request and response to endpoint indexes', async () => {
      await s1ActionsClient.isolate(createS1IsolateOptions());

      expect(classConstructorOptions.esClient.index).toHaveBeenCalledTimes(1);
      // FIXME:PT once we start writing the Response, check above should be removed and new assertion added for it
      expect(classConstructorOptions.esClient.index).toHaveBeenNthCalledWith(
        1,
        {
          document: {
            '@timestamp': expect.any(String),
            EndpointActions: {
              action_id: expect.any(String),
              data: { command: 'isolate', comment: 'test comment', parameters: undefined },
              expiration: expect.any(String),
              input_type: 'sentinel_one',
              type: 'INPUT_ACTION',
            },
            agent: { id: ['1-2-3'] },
            user: { id: 'foo' },
          },
          index: '.logs-endpoint.actions-default',
          refresh: 'wait_for',
        },
        { meta: true }
      );
    });

    it('should return action details', async () => {
      await s1ActionsClient.isolate(createS1IsolateOptions());

      expect(getActionDetailsByIdMock).toHaveBeenCalled();
    });
  });
});
