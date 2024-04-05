/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResponseActionsClient } from '../lib/types';
import { responseActionsClientMock } from '../mocks';
import { CrowdstrikeActionsClient } from './crowdstrike_actions_client';
import { getActionDetailsById as _getActionDetailsById } from '../../action_details_by_id';
import { ResponseActionsNotSupportedError } from '../errors';
import type { CrowdstrikeActionsClientOptionsMock } from './mocks';
import { CrowdstrikeMock } from './mocks';

import { ENDPOINT_ACTIONS_INDEX } from '../../../../../../common/endpoint/constants';
import { SUB_ACTION } from '@kbn/stack-connectors-plugin/common/crowdstrike/constants';
import type { NormalizedExternalConnectorClient } from '../../..';
jest.mock('../../action_details_by_id', () => {
  const originalMod = jest.requireActual('../../action_details_by_id');

  return {
    ...originalMod,
    getActionDetailsById: jest.fn(originalMod.getActionDetailsById),
  };
});

const getActionDetailsByIdMock = _getActionDetailsById as jest.Mock;

describe('CrowdstrikeActionsClient class', () => {
  let classConstructorOptions: CrowdstrikeActionsClientOptionsMock;
  let crowdstrikeActionsClient: ResponseActionsClient;
  let connectorActionsMock: NormalizedExternalConnectorClient;

  const createCrowdstrikeIsolationOptions = (
    overrides: Omit<
      Parameters<typeof responseActionsClientMock.createIsolateOptions>[0],
      'agent_type'
    > = {}
  ) => responseActionsClientMock.createIsolateOptions({ ...overrides, agent_type: 'crowdstrike' });

  beforeEach(() => {
    classConstructorOptions = CrowdstrikeMock.createConstructorOptions();
    connectorActionsMock = classConstructorOptions.connectorActions;
    crowdstrikeActionsClient = new CrowdstrikeActionsClient(classConstructorOptions);
    classConstructorOptions.esClient.search.mockResolvedValueOnce(
      CrowdstrikeMock.createEventSearchResponse()
    );
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
      await expect(crowdstrikeActionsClient[methodName]({})).rejects.toBeInstanceOf(
        ResponseActionsNotSupportedError
      );
    }
  );

  it('should error if multiple agent ids are received', async () => {
    const payload = createCrowdstrikeIsolationOptions();
    payload.endpoint_ids.push('second-host-id');

    await expect(crowdstrikeActionsClient.isolate(payload)).rejects.toMatchObject({
      message: `[body.endpoint_ids]: Multiple agents IDs not currently supported for Crowdstrike`,
      statusCode: 400,
    });
  });

  describe(`#isolate()`, () => {
    it('should send action to Crowdstrike', async () => {
      await crowdstrikeActionsClient.isolate(createCrowdstrikeIsolationOptions());

      expect(connectorActionsMock.execute as jest.Mock).toHaveBeenCalledWith({
        params: {
          subAction: SUB_ACTION.HOST_ACTIONS,
          subActionParams: {
            actionParameters: {
              comment: 'test comment',
            },
            command: 'contain',
            ids: ['1-2-3'],
          },
        },
      });
    });

    it('should write action request to endpoint indexes', async () => {
      await crowdstrikeActionsClient.isolate(createCrowdstrikeIsolationOptions());

      // we do not write response to es yet
      expect(classConstructorOptions.esClient.index).toHaveBeenCalledTimes(1);
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
                    name: 'Crowdstrike-1460',
                  },
                },
              },
              expiration: expect.any(String),
              input_type: 'crowdstrike',
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
    });

    it('should return action details', async () => {
      await crowdstrikeActionsClient.isolate(createCrowdstrikeIsolationOptions());

      expect(getActionDetailsByIdMock).toHaveBeenCalled();
    });

    it('should update cases', async () => {
      await crowdstrikeActionsClient.isolate(
        createCrowdstrikeIsolationOptions({
          case_ids: ['case-1'],
        })
      );

      expect(classConstructorOptions.casesClient?.attachments.bulkCreate).toHaveBeenCalled();
    });
  });

  describe('#release()', () => {
    it('should send action to Crowdstrike', async () => {
      await crowdstrikeActionsClient.release(createCrowdstrikeIsolationOptions());

      expect(connectorActionsMock.execute as jest.Mock).toHaveBeenCalledWith({
        params: {
          subAction: SUB_ACTION.HOST_ACTIONS,
          subActionParams: {
            command: 'lift_containment',
            ids: ['1-2-3'],
          },
        },
      });
    });

    it('should write action request to endpoint indexes', async () => {
      await crowdstrikeActionsClient.release(createCrowdstrikeIsolationOptions());

      // we do not write response to es yet
      expect(classConstructorOptions.esClient.index).toHaveBeenCalledTimes(1);
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
                    name: 'Crowdstrike-1460',
                  },
                },
              },
              expiration: expect.any(String),
              input_type: 'crowdstrike',
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
    });

    it('should return action details', async () => {
      await crowdstrikeActionsClient.release(createCrowdstrikeIsolationOptions());

      expect(getActionDetailsByIdMock).toHaveBeenCalled();
    });

    it('should update cases', async () => {
      await crowdstrikeActionsClient.release(
        createCrowdstrikeIsolationOptions({
          case_ids: ['case-1'],
        })
      );

      expect(classConstructorOptions.casesClient?.attachments.bulkCreate).toHaveBeenCalled();
    });
  });
});
