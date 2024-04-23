/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResponseActionsClient, ProcessPendingActionsMethodOptions } from '../lib/types';
import { responseActionsClientMock } from '../mocks';
import { SentinelOneActionsClient } from './sentinel_one_actions_client';
import { getActionDetailsById as _getActionDetailsById } from '../../action_details_by_id';
import { ResponseActionsNotSupportedError } from '../errors';
import type { SentinelOneActionsClientOptionsMock } from './mocks';
import { sentinelOneMock } from './mocks';
import {
  ENDPOINT_ACTION_RESPONSES_INDEX,
  ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
  ENDPOINT_ACTIONS_INDEX,
} from '../../../../../../common/endpoint/constants';
import type { NormalizedExternalConnectorClient } from '../../..';
import { applyEsClientSearchMock } from '../../../../mocks/utils.mock';
import { SENTINEL_ONE_ACTIVITY_INDEX } from '../../../../../../common';
import { SentinelOneDataGenerator } from '../../../../../../common/endpoint/data_generators/sentinelone_data_generator';
import type {
  EndpointActionResponse,
  LogsEndpointAction,
  LogsEndpointActionResponse,
  SentinelOneActivityEsDoc,
  SentinelOneIsolationRequestMeta,
} from '../../../../../../common/endpoint/types';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { ResponseActionGetFileRequestBody } from '../../../../../../common/api/endpoint';
import { SENTINEL_ONE_ZIP_PASSCODE } from '../../../../../../common/endpoint/service/response_actions/sentinel_one';
import { SUB_ACTION } from '@kbn/stack-connectors-plugin/common/sentinelone/constants';

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

  it.each(['killProcess', 'suspendProcess', 'runningProcesses', 'execute', 'upload'] as Array<
    keyof ResponseActionsClient
  >)('should throw an un-supported error for %s', async (methodName) => {
    // @ts-expect-error Purposely passing in empty object for options
    await expect(s1ActionsClient[methodName]({})).rejects.toBeInstanceOf(
      ResponseActionsNotSupportedError
    );
  });

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

    it('should write action request and response to endpoint indexes when `responseActionsSentinelOneV2Enabled` FF is Disabled', async () => {
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
            meta: {
              agentId: '1845174760470303882',
              agentUUID: '1-2-3',
              hostName: 'sentinelone-1460',
            },
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

    it('should write action request (only) to endpoint indexes when `responseActionsSentinelOneV2Enabled` FF is Enabled', async () => {
      // @ts-expect-error updating readonly attribute
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneV2Enabled =
        true;
      await s1ActionsClient.isolate(createS1IsolationOptions());

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
            meta: {
              agentId: '1845174760470303882',
              agentUUID: '1-2-3',
              hostName: 'sentinelone-1460',
            },
          },
          index: ENDPOINT_ACTIONS_INDEX,
          refresh: 'wait_for',
        },
        { meta: true }
      );
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

    it('should write action request and response to endpoint indexes when `responseActionsSentinelOneV2Enabled` is Disabled', async () => {
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
            meta: {
              agentId: '1845174760470303882',
              agentUUID: '1-2-3',
              hostName: 'sentinelone-1460',
            },
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

    it('should write action request (only) to endpoint indexes when `` is Enabled', async () => {
      // @ts-expect-error updating readonly attribute
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneV2Enabled =
        true;
      await s1ActionsClient.release(createS1IsolationOptions());

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
            meta: {
              agentId: '1845174760470303882',
              agentUUID: '1-2-3',
              hostName: 'sentinelone-1460',
            },
          },
          index: ENDPOINT_ACTIONS_INDEX,
          refresh: 'wait_for',
        },
        { meta: true }
      );
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

  describe('#processPendingActions()', () => {
    let abortController: AbortController;
    let processPendingActionsOptions: ProcessPendingActionsMethodOptions;

    beforeEach(() => {
      abortController = new AbortController();
      processPendingActionsOptions = {
        abortSignal: abortController.signal,
        addToQueue: jest.fn(),
      };
    });

    describe('for Isolate and Release', () => {
      let actionRequestHits: Array<
        SearchHit<LogsEndpointAction<undefined, {}, SentinelOneIsolationRequestMeta>>
      >;
      let s1ActivityHits: Array<SearchHit<SentinelOneActivityEsDoc>>;

      beforeEach(() => {
        const s1DataGenerator = new SentinelOneDataGenerator('seed');
        const actionRequestsSearchResponse = s1DataGenerator.toEsSearchResponse([
          s1DataGenerator.generateActionEsHit<undefined, {}, SentinelOneIsolationRequestMeta>({
            agent: { id: 'agent-uuid-1' },
            EndpointActions: { data: { command: 'isolate' } },
            meta: {
              agentId: 's1-agent-a',
              agentUUID: 'agent-uuid-1',
              hostName: 's1-host-name',
            },
          }),
        ]);
        const actionResponsesSearchResponse = s1DataGenerator.toEsSearchResponse<
          LogsEndpointActionResponse | EndpointActionResponse
        >([]);
        const s1ActivitySearchResponse = s1DataGenerator.generateActivityEsSearchResponse([
          s1DataGenerator.generateActivityEsSearchHit({
            sentinel_one: {
              activity: {
                agent: {
                  id: 's1-agent-a',
                },
                type: 1001,
              },
            },
          }),
        ]);

        actionRequestHits = actionRequestsSearchResponse.hits.hits;
        s1ActivityHits = s1ActivitySearchResponse.hits.hits;

        applyEsClientSearchMock({
          esClientMock: classConstructorOptions.esClient,
          index: ENDPOINT_ACTIONS_INDEX,
          response: actionRequestsSearchResponse,
          pitUsage: true,
        });

        applyEsClientSearchMock({
          esClientMock: classConstructorOptions.esClient,
          index: ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
          response: actionResponsesSearchResponse,
        });

        applyEsClientSearchMock({
          esClientMock: classConstructorOptions.esClient,
          index: SENTINEL_ONE_ACTIVITY_INDEX,
          response: s1ActivitySearchResponse,
        });
      });

      it('should generate action response docs for completed actions', async () => {
        await s1ActionsClient.processPendingActions(processPendingActionsOptions);

        expect(processPendingActionsOptions.addToQueue).toHaveBeenCalledWith({
          '@timestamp': expect.any(String),
          EndpointActions: {
            action_id: '1d6e6796-b0af-496f-92b0-25fcb06db499',
            completed_at: expect.any(String),
            data: {
              command: 'isolate',
            },
            input_type: 'sentinel_one',
            started_at: expect.any(String),
          },
          agent: {
            id: 'agent-uuid-1',
          },
          error: undefined,
          meta: {
            activityLogEntryDescription: 'Some description here',
            activityLogEntryId: 'd78282bc-e413-468d-9df6-570b91756a6d',
            activityLogEntryType: 1001,
            elasticDocId: '85f7f003-ebed-4157-b8e6-16ae44fc4be7',
          },
        });
      });

      it('should NOT generate action responses if no activity received from S1', async () => {
        s1ActivityHits.length = 0;
        await s1ActionsClient.processPendingActions(processPendingActionsOptions);

        expect(processPendingActionsOptions.addToQueue).not.toHaveBeenCalled();
      });

      it('should complete action as failure S1 agent id meta is missing (edge case)', async () => {
        actionRequestHits[0]!._source!.meta!.agentId = '';
        await s1ActionsClient.processPendingActions(processPendingActionsOptions);

        expect(processPendingActionsOptions.addToQueue).toHaveBeenCalledWith(
          expect.objectContaining({
            error: {
              message:
                "Unable to very if action completed. SentinelOne agent id ('meta.agentId') missing on action request document!",
            },
          })
        );
      });

      it('should generate failed isolate response doc if S1 activity `type` is 2010', async () => {
        s1ActivityHits[0]._source!.sentinel_one.activity.type = 2010;
        s1ActivityHits[0]._source!.sentinel_one.activity.description.primary =
          'Agent SOME_HOST_NAME was unable to disconnect from network.';
        await s1ActionsClient.processPendingActions(processPendingActionsOptions);

        expect(processPendingActionsOptions.addToQueue).toHaveBeenCalledWith(
          expect.objectContaining({
            error: {
              message: 'Agent SOME_HOST_NAME was unable to disconnect from network.',
            },
          })
        );
      });

      it('should search SentinelOne activity ES index with expected query for isolate', async () => {
        await s1ActionsClient.processPendingActions(processPendingActionsOptions);

        expect(classConstructorOptions.esClient.search).toHaveBeenNthCalledWith(4, {
          _source: false,
          collapse: {
            field: 'sentinel_one.activity.agent.id',
            inner_hits: {
              name: 'first_found',
              size: 1,
              sort: [{ 'sentinel_one.activity.updated_at': 'asc' }],
            },
          },
          index: SENTINEL_ONE_ACTIVITY_INDEX,
          query: {
            bool: {
              minimum_should_match: 1,
              must: [{ terms: { 'sentinel_one.activity.type': [1001, 2010] } }],
              should: [
                {
                  bool: {
                    filter: [
                      { term: { 'sentinel_one.activity.agent.id': 's1-agent-a' } },
                      {
                        range: {
                          'sentinel_one.activity.updated_at': { gt: expect.any(String) },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          size: 1000,
          sort: [{ 'sentinel_one.activity.updated_at': { order: 'asc' } }],
        });
      });

      it('should search SentinelOne activity ES index with expected query for release', async () => {
        actionRequestHits[0]._source!.EndpointActions.data.command = 'unisolate';
        await s1ActionsClient.processPendingActions(processPendingActionsOptions);

        expect(classConstructorOptions.esClient.search).toHaveBeenNthCalledWith(4, {
          _source: false,
          collapse: {
            field: 'sentinel_one.activity.agent.id',
            inner_hits: {
              name: 'first_found',
              size: 1,
              sort: [{ 'sentinel_one.activity.updated_at': 'asc' }],
            },
          },
          index: SENTINEL_ONE_ACTIVITY_INDEX,
          query: {
            bool: {
              minimum_should_match: 1,
              must: [{ terms: { 'sentinel_one.activity.type': [1002] } }],
              should: [
                {
                  bool: {
                    filter: [
                      { term: { 'sentinel_one.activity.agent.id': 's1-agent-a' } },
                      {
                        range: {
                          'sentinel_one.activity.updated_at': { gt: expect.any(String) },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          size: 1000,
          sort: [{ 'sentinel_one.activity.updated_at': { order: 'asc' } }],
        });
      });
    });
  });

  describe('#getFile()', () => {
    let getFileReqOptions: ResponseActionGetFileRequestBody;

    beforeEach(() => {
      // @ts-expect-error readonly prop assignment
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneGetFileEnabled =
        true;

      getFileReqOptions = responseActionsClientMock.createGetFileOptions();
    });

    it('should error if feature flag is not enabled', async () => {
      // @ts-expect-error readonly prop assignment
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneGetFileEnabled =
        false;

      await expect(s1ActionsClient.getFile(getFileReqOptions)).rejects.toHaveProperty(
        'message',
        'get-file not supported for sentinel_one agent type. Feature disabled'
      );
    });

    it('should call the fetch agent files connector method with expected params', async () => {
      await s1ActionsClient.getFile(getFileReqOptions);

      expect(connectorActionsMock.execute).toHaveBeenCalledWith({
        params: {
          subAction: SUB_ACTION.FETCH_AGENT_FILES,
          subActionParams: {
            agentUUID: '1-2-3',
            files: [getFileReqOptions.parameters.path],
            zipPassCode: SENTINEL_ONE_ZIP_PASSCODE,
          },
        },
      });
    });

    it('should throw if sentinelone api generated an error (manual mode)', async () => {
      const executeMockFn = (connectorActionsMock.execute as jest.Mock).getMockImplementation();
      const err = new Error('oh oh');
      (connectorActionsMock.execute as jest.Mock).mockImplementation(async (options) => {
        if (options.params.subAction === SUB_ACTION.FETCH_AGENT_FILES) {
          throw err;
        }
        return executeMockFn!(options);
      });

      await expect(s1ActionsClient.getFile(getFileReqOptions)).rejects.toEqual(err);
      await expect(connectorActionsMock.execute).not.toHaveBeenCalledWith({
        params: expect.objectContaining({
          subAction: SUB_ACTION.GET_ACTIVITIES,
        }),
      });
    });

    it('should create failed response action when calling sentinelone api generated an error (automated mode)', async () => {
      const subActionsClient = sentinelOneMock.createConnectorActionsClient();
      classConstructorOptions = sentinelOneMock.createConstructorOptions();
      classConstructorOptions.isAutomated = true;
      classConstructorOptions.connectorActions =
        responseActionsClientMock.createNormalizedExternalConnectorClient(subActionsClient);
      connectorActionsMock = classConstructorOptions.connectorActions;
      // @ts-expect-error readonly prop assignment
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneGetFileEnabled =
        true;
      s1ActionsClient = new SentinelOneActionsClient(classConstructorOptions);

      const executeMockFn = (subActionsClient.execute as jest.Mock).getMockImplementation();
      const err = new Error('oh oh');
      (subActionsClient.execute as jest.Mock).mockImplementation(async (options) => {
        if (options.params.subAction === SUB_ACTION.FETCH_AGENT_FILES) {
          throw err;
        }
        return executeMockFn!.call(SentinelOneActionsClient.prototype, options);
      });

      await expect(s1ActionsClient.getFile(getFileReqOptions)).resolves.toBeTruthy();
      expect(classConstructorOptions.esClient.index).toHaveBeenCalledWith(
        {
          document: {
            '@timestamp': expect.any(String),
            EndpointActions: {
              action_id: expect.any(String),
              data: {
                command: 'get-file',
                comment: 'test comment',
                parameters: {
                  path: '/some/file',
                },
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
            error: {
              // The error message here is "not supported" because `get-file` is not currently supported
              // for automated response actions. if that changes in the future the message below should
              // be changed to `err.message` (`err` is defined and used in the mock setup above)
              message: 'Action [get-file] not supported',
            },
            meta: {
              agentId: '1845174760470303882',
              agentUUID: '1-2-3',
              hostName: 'sentinelone-1460',
            },
          },
          index: ENDPOINT_ACTIONS_INDEX,
          refresh: 'wait_for',
        },
        { meta: true }
      );
    });

    it('should query for the activity log entry record after successful submit of action', async () => {
      await s1ActionsClient.getFile(getFileReqOptions);

      expect(connectorActionsMock.execute).toHaveBeenNthCalledWith(3, {
        params: {
          subAction: SUB_ACTION.GET_ACTIVITIES,
          subActionParams: {
            activityTypes: '81',
            limit: 1,
            sortBy: 'createdAt',
            sortOrder: 'asc',
            // eslint-disable-next-line @typescript-eslint/naming-convention
            createdAt__gte: expect.any(String),
            agentIds: '1845174760470303882',
          },
        },
      });
    });

    it('should create action request ES document with expected meta content', async () => {
      await s1ActionsClient.getFile(getFileReqOptions);

      expect(classConstructorOptions.esClient.index).toHaveBeenCalledWith(
        {
          document: {
            '@timestamp': expect.any(String),
            EndpointActions: {
              action_id: expect.any(String),
              data: {
                command: 'get-file',
                comment: 'test comment',
                parameters: {
                  path: '/some/file',
                },
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
            meta: {
              agentId: '1845174760470303882',
              agentUUID: '1-2-3',
              hostName: 'sentinelone-1460',
              activityId: '1929937418124016884',
              commandBatchUuid: '7011777f-77e7-4a01-a674-e5f767808895',
            },
          },
          index: ENDPOINT_ACTIONS_INDEX,
          refresh: 'wait_for',
        },
        { meta: true }
      );
    });

    it('should return action details', async () => {
      await expect(s1ActionsClient.getFile(getFileReqOptions)).resolves.toEqual(
        // Only validating that a ActionDetails is returned. The data is mocked,
        // so it does not make sense to validate the property values
        {
          action: expect.any(String),
          agentState: expect.any(Object),
          agentType: expect.any(String),
          agents: expect.any(Array),
          command: expect.any(String),
          comment: expect.any(String),
          createdBy: expect.any(String),
          hosts: expect.any(Object),
          id: expect.any(String),
          isCompleted: expect.any(Boolean),
          isExpired: expect.any(Boolean),
          outputs: expect.any(Object),
          startedAt: expect.any(String),
          status: expect.any(String),
          wasSuccessful: expect.any(Boolean),
        }
      );
    });

    it('should update cases', async () => {
      await s1ActionsClient.getFile(
        responseActionsClientMock.createGetFileOptions({ case_ids: ['case-1'] })
      );

      expect(classConstructorOptions.casesClient?.attachments.bulkCreate).toHaveBeenCalled();
    });
  });
});
