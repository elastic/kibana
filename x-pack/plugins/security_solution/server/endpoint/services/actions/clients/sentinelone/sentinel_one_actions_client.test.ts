/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResponseActionsClient } from '../lib/types';
import { responseActionsClientMock } from '../mocks';
import { SentinelOneActionsClient } from './sentinel_one_actions_client';
import { getActionDetailsById as _getActionDetailsById } from '../../action_details_by_id';
import { ResponseActionsNotSupportedError } from '../errors';
import type { SentinelOneActionsClientOptionsMock } from './mocks';
import { sentinelOneMock } from './mocks';
import {
  ENDPOINT_ACTION_RESPONSES_INDEX,
  ENDPOINT_ACTIONS_INDEX,
} from '../../../../../../common/endpoint/constants';
import type { NormalizedExternalConnectorClient } from '../../..';

jest.mock('../../action_details_by_id', () => {
  const originalMod = jest.requireActual('../../action_details_by_id');

  return {
    ...originalMod,
    getActionDetailsById: jest.fn(originalMod.getActionDetailsById),
  };
});

const getActionDetailsByIdMock = _getActionDetailsById as jest.Mock;

describe('SentinelOneActionsClient class', () => {
  let classConstructorOptions: SentinelOneActionsClientOptionsMock;
  let s1ActionsClient: ResponseActionsClient;
  let connectorActionsMock: NormalizedExternalConnectorClient;

  const createS1IsolationOptions = (
    overrides: Omit<
      Parameters<typeof responseActionsClientMock.createIsolateOptions>[0],
      'agent_type'
    > = {}
  ) => responseActionsClientMock.createIsolateOptions({ ...overrides, agent_type: 'sentinel_one' });

  beforeEach(() => {
    classConstructorOptions = sentinelOneMock.createConstructorOptions();
    connectorActionsMock = classConstructorOptions.connectorActions;
    s1ActionsClient = new SentinelOneActionsClient(classConstructorOptions);
  });

  it.each([
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

  it('should error if multiple agent ids are received', async () => {
    const payload = createS1IsolationOptions();
    payload.endpoint_ids.push('second-host-id');

    await expect(s1ActionsClient.isolate(payload)).rejects.toMatchObject({
      message: `[body.endpoint_ids]: Multiple agents IDs not currently supported for SentinelOne`,
      statusCode: 400,
    });
  });

  describe(`#isolate()`, () => {
    it('should send action to sentinelone', async () => {
      await s1ActionsClient.isolate(createS1IsolationOptions());

      expect(connectorActionsMock.execute as jest.Mock).toHaveBeenCalledWith({
        params: {
          subAction: 'isolateHost',
          subActionParams: {
            uuid: '1-2-3',
          },
        },
      });
    });

    it('should write action request and response to endpoint indexes', async () => {
      await s1ActionsClient.isolate(createS1IsolationOptions());

      expect(classConstructorOptions.esClient.index).toHaveBeenCalledTimes(2);
      expect(classConstructorOptions.esClient.index).toHaveBeenNthCalledWith(
        1,
        {
          document: {
            '@timestamp': expect.any(String),
            EndpointActions: {
              action_id: expect.any(String),
              data: {
                command: 'isolate',
                comment: 'test comment',
                parameters: undefined,
                hosts: {
                  '1-2-3': {
                    name: 'sentinelone-1460',
                  },
                },
              },
              expiration: expect.any(String),
              input_type: 'sentinel_one',
              type: 'INPUT_ACTION',
            },
            agent: { id: ['1-2-3'] },
            user: { id: 'foo' },
          },
          index: ENDPOINT_ACTIONS_INDEX,
          refresh: 'wait_for',
        },
        { meta: true }
      );
      expect(classConstructorOptions.esClient.index).toHaveBeenNthCalledWith(2, {
        document: {
          '@timestamp': expect.any(String),
          EndpointActions: {
            action_id: expect.any(String),
            data: { command: 'isolate' },
            input_type: 'sentinel_one',
            started_at: expect.any(String),
            completed_at: expect.any(String),
          },
          agent: { id: ['1-2-3'] },
          error: undefined,
        },
        index: ENDPOINT_ACTION_RESPONSES_INDEX,
        refresh: 'wait_for',
      });
    });

    it('should return action details', async () => {
      await s1ActionsClient.isolate(createS1IsolationOptions());

      expect(getActionDetailsByIdMock).toHaveBeenCalled();
    });

    it('should update cases', async () => {
      await s1ActionsClient.isolate(
        createS1IsolationOptions({
          case_ids: ['case-1'],
        })
      );

      expect(classConstructorOptions.casesClient?.attachments.bulkCreate).toHaveBeenCalled();
    });
  });

  describe('#release()', () => {
    it('should send action to sentinelone', async () => {
      await s1ActionsClient.release(createS1IsolationOptions());

      expect(connectorActionsMock.execute as jest.Mock).toHaveBeenCalledWith({
        params: {
          subAction: 'releaseHost',
          subActionParams: {
            uuid: '1-2-3',
          },
        },
      });
    });

    it('should write action request and response to endpoint indexes', async () => {
      await s1ActionsClient.release(createS1IsolationOptions());

      expect(classConstructorOptions.esClient.index).toHaveBeenCalledTimes(2);
      expect(classConstructorOptions.esClient.index).toHaveBeenNthCalledWith(
        1,
        {
          document: {
            '@timestamp': expect.any(String),
            EndpointActions: {
              action_id: expect.any(String),
              data: {
                command: 'unisolate',
                comment: 'test comment',
                parameters: undefined,
                hosts: {
                  '1-2-3': {
                    name: 'sentinelone-1460',
                  },
                },
              },
              expiration: expect.any(String),
              input_type: 'sentinel_one',
              type: 'INPUT_ACTION',
            },
            agent: { id: ['1-2-3'] },
            user: { id: 'foo' },
          },
          index: ENDPOINT_ACTIONS_INDEX,
          refresh: 'wait_for',
        },
        { meta: true }
      );
      expect(classConstructorOptions.esClient.index).toHaveBeenNthCalledWith(2, {
        document: {
          '@timestamp': expect.any(String),
          EndpointActions: {
            action_id: expect.any(String),
            data: { command: 'unisolate' },
            input_type: 'sentinel_one',
            started_at: expect.any(String),
            completed_at: expect.any(String),
          },
          agent: { id: ['1-2-3'] },
          error: undefined,
        },
        index: ENDPOINT_ACTION_RESPONSES_INDEX,
        refresh: 'wait_for',
      });
    });

    it('should return action details', async () => {
      await s1ActionsClient.release(createS1IsolationOptions());

      expect(getActionDetailsByIdMock).toHaveBeenCalled();
    });

    it('should update cases', async () => {
      await s1ActionsClient.release(
        createS1IsolationOptions({
          case_ids: ['case-1'],
        })
      );

      expect(classConstructorOptions.casesClient?.attachments.bulkCreate).toHaveBeenCalled();
    });
  });
});
