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
import type {
  NormalizedExternalConnectorClient,
  NormalizedExternalConnectorClientExecuteOptions,
} from '../../..';
import { applyEsClientSearchMock } from '../../../../mocks/utils.mock';
import { SENTINEL_ONE_ACTIVITY_INDEX_PATTERN } from '../../../../../../common';
import { SentinelOneDataGenerator } from '../../../../../../common/endpoint/data_generators/sentinelone_data_generator';
import type {
  EndpointActionResponse,
  LogsEndpointAction,
  LogsEndpointActionResponse,
  SentinelOneActivityEsDoc,
  SentinelOneIsolationRequestMeta,
  SentinelOneActivityDataForType80,
  ResponseActionGetFileOutputContent,
  ResponseActionGetFileParameters,
  SentinelOneGetFileRequestMeta,
  KillOrSuspendProcessRequestBody,
} from '../../../../../../common/endpoint/types';
import type { SearchHit, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type {
  ResponseActionGetFileRequestBody,
  GetProcessesRequestBody,
} from '../../../../../../common/api/endpoint';
import { SUB_ACTION } from '@kbn/stack-connectors-plugin/common/sentinelone/constants';
import { ACTIONS_SEARCH_PAGE_SIZE } from '../../constants';
import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { Readable } from 'stream';
import { RESPONSE_ACTIONS_ZIP_PASSCODE } from '../../../../../../common/endpoint/service/response_actions/constants';
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';
import type {
  SentinelOneGetRemoteScriptStatusApiResponse,
  SentinelOneRemoteScriptExecutionStatus,
} from '@kbn/stack-connectors-plugin/common/sentinelone/types';

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
  let connectorActionsMock: DeeplyMockedKeys<NormalizedExternalConnectorClient>;

  const createS1IsolationOptions = (
    overrides: Omit<
      Parameters<typeof responseActionsClientMock.createIsolateOptions>[0],
      'agent_type'
    > = {}
  ) => responseActionsClientMock.createIsolateOptions({ ...overrides, agent_type: 'sentinel_one' });

  beforeEach(() => {
    classConstructorOptions = sentinelOneMock.createConstructorOptions();
    connectorActionsMock =
      classConstructorOptions.connectorActions as DeeplyMockedKeys<NormalizedExternalConnectorClient>;
    s1ActionsClient = new SentinelOneActionsClient(classConstructorOptions);
  });

  it.each(['suspendProcess', 'execute', 'upload', 'scan'] as Array<keyof ResponseActionsClient>)(
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

    it('should write action request and response to endpoint indexes when `responseActionsSentinelOneV2Enabled` FF is Disabled', async () => {
      // @ts-expect-error updating readonly attribute
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneV2Enabled =
        false;
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
      // @ts-expect-error updating readonly attribute
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneV2Enabled =
        false;
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

    const setGetRemoteScriptStatusConnectorResponse = (
      response: SentinelOneGetRemoteScriptStatusApiResponse
    ): void => {
      const executeMockFn = (connectorActionsMock.execute as jest.Mock).getMockImplementation();

      (connectorActionsMock.execute as jest.Mock).mockImplementation(async (options) => {
        if (options.params.subAction === SUB_ACTION.GET_REMOTE_SCRIPT_STATUS) {
          return responseActionsClientMock.createConnectorActionExecuteResponse({
            data: response,
          });
        }

        return executeMockFn!(options);
      });
    };

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
          index: SENTINEL_ONE_ACTIVITY_INDEX_PATTERN,
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
          index: SENTINEL_ONE_ACTIVITY_INDEX_PATTERN,
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
          size: ACTIONS_SEARCH_PAGE_SIZE,
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
          index: SENTINEL_ONE_ACTIVITY_INDEX_PATTERN,
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
          size: ACTIONS_SEARCH_PAGE_SIZE,
          sort: [{ 'sentinel_one.activity.updated_at': { order: 'asc' } }],
        });
      });
    });

    describe('for get-file response action', () => {
      let actionRequestsSearchResponse: SearchResponse<
        LogsEndpointAction<ResponseActionGetFileParameters, ResponseActionGetFileOutputContent>
      >;

      beforeEach(() => {
        const s1DataGenerator = new SentinelOneDataGenerator('seed');
        actionRequestsSearchResponse = s1DataGenerator.toEsSearchResponse([
          s1DataGenerator.generateActionEsHit<
            ResponseActionGetFileParameters,
            ResponseActionGetFileOutputContent,
            SentinelOneGetFileRequestMeta
          >({
            agent: { id: 'agent-uuid-1' },
            EndpointActions: { data: { command: 'get-file' } },
            meta: {
              agentId: 's1-agent-a',
              agentUUID: 'agent-uuid-1',
              hostName: 's1-host-name',
              commandBatchUuid: 'batch-111',
              activityId: 'activity-222',
            },
          }),
        ]);
        const actionResponsesSearchResponse = s1DataGenerator.toEsSearchResponse<
          LogsEndpointActionResponse | EndpointActionResponse
        >([]);
        const s1ActivitySearchResponse = s1DataGenerator.generateActivityEsSearchResponse([
          s1DataGenerator.generateActivityEsSearchHit<SentinelOneActivityDataForType80>({
            sentinel_one: {
              activity: {
                id: 'activity-222',
                data: s1DataGenerator.generateActivityFetchFileResponseData({
                  flattened: {
                    commandBatchUuid: 'batch-111',
                  },
                }),
                agent: {
                  id: 's1-agent-a',
                },
                type: 80,
              },
            },
          }),
        ]);

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
          index: SENTINEL_ONE_ACTIVITY_INDEX_PATTERN,
          response: s1ActivitySearchResponse,
        });
      });

      it('should search for S1 activity with correct query', async () => {
        await s1ActionsClient.processPendingActions(processPendingActionsOptions);

        expect(classConstructorOptions.esClient.search).toHaveBeenNthCalledWith(4, {
          index: SENTINEL_ONE_ACTIVITY_INDEX_PATTERN,
          size: ACTIONS_SEARCH_PAGE_SIZE,
          query: {
            bool: {
              minimum_should_match: 1,
              must: [
                {
                  term: {
                    'sentinel_one.activity.type': 80,
                  },
                },
              ],
              should: [
                {
                  bool: {
                    filter: [
                      {
                        term: {
                          'sentinel_one.activity.agent.id': 's1-agent-a',
                        },
                      },
                      {
                        term: {
                          'sentinel_one.activity.data.flattened.commandBatchUuid': 'batch-111',
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        });
      });

      it('should complete action as a failure if no S1 agentId/commandBatchUuid present in action request doc', async () => {
        actionRequestsSearchResponse.hits.hits[0]!._source!.meta = {
          agentId: 's1-agent-a',
          agentUUID: 'agent-uuid-1',
          hostName: 's1-host-name',
        };
        await s1ActionsClient.processPendingActions(processPendingActionsOptions);

        expect(processPendingActionsOptions.addToQueue).toHaveBeenCalledWith(
          expect.objectContaining({
            error: {
              message:
                'Unable to very if action completed. SentinelOne agent id or commandBatchUuid missing on action request document!',
            },
          })
        );
      });

      it('should generate an action success response doc', async () => {
        await s1ActionsClient.processPendingActions(processPendingActionsOptions);

        expect(processPendingActionsOptions.addToQueue).toHaveBeenCalledWith({
          '@timestamp': expect.any(String),
          EndpointActions: {
            action_id: '1d6e6796-b0af-496f-92b0-25fcb06db499',
            completed_at: expect.any(String),
            data: {
              command: 'get-file',
              comment: 'Some description here',
              output: {
                content: {
                  code: '',
                  contents: [],
                  zip_size: 0,
                },
                type: 'json',
              },
            },
            input_type: 'sentinel_one',
            started_at: expect.any(String),
          },
          agent: {
            id: 'agent-uuid-1',
          },
          error: undefined,
          meta: {
            activityLogEntryId: 'activity-222',
            downloadUrl: '/agents/5173897/uploads/40558796',
            elasticDocId: '16ae44fc-4be7-446c-8e8f-a5c082dda918',
            createdAt: expect.any(String),
            filename: 'file.zip',
          },
        });
      });
    });

    // The following response actions use SentinelOne's remote execution scripts, thus they can be
    // tested the same
    describe.each`
      actionName             | requestData                                                         | responseOutputContent
      ${'kill-process'}      | ${{ command: 'kill-process', parameters: { process_name: 'foo' } }} | ${{ code: 'ok', command: 'kill-process', process_name: 'foo' }}
      ${'running-processes'} | ${{ command: 'running-processes', parameters: undefined }}          | ${{ code: '', entries: [] }}
    `('for $actionName response action', ({ actionName, requestData, responseOutputContent }) => {
      let actionRequestsSearchResponse: SearchResponse<LogsEndpointAction>;

      beforeEach(() => {
        const s1DataGenerator = new SentinelOneDataGenerator('seed');

        actionRequestsSearchResponse = s1DataGenerator.toEsSearchResponse([
          s1DataGenerator.generateActionEsHit({
            agent: { id: 'agent-uuid-1' },
            EndpointActions: {
              data: requestData,
            },
            meta: {
              agentId: 's1-agent-a',
              agentUUID: 'agent-uuid-1',
              hostName: 's1-host-name',
              parentTaskId: 's1-parent-task-123',
            },
          }),
        ]);
        const actionResponsesSearchResponse = s1DataGenerator.toEsSearchResponse<
          LogsEndpointActionResponse | EndpointActionResponse
        >([]);

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
      });

      it('should create response at error if request has no parentTaskId', async () => {
        // @ts-expect-error
        actionRequestsSearchResponse.hits.hits[0]!._source!.meta!.parentTaskId = '';
        await s1ActionsClient.processPendingActions(processPendingActionsOptions);

        expect(processPendingActionsOptions.addToQueue).toHaveBeenCalledWith({
          '@timestamp': expect.any(String),
          EndpointActions: {
            action_id: '1d6e6796-b0af-496f-92b0-25fcb06db499',
            completed_at: expect.any(String),
            data: {
              command: requestData.command,
              comment: '',
            },
            input_type: 'sentinel_one',
            started_at: expect.any(String),
          },
          agent: {
            id: 'agent-uuid-1',
          },
          error: {
            message:
              "Action request missing SentinelOne 'parentTaskId' value - unable check on its status",
          },
          meta: undefined,
        });
      });

      it('should do nothing if action is still pending', async () => {
        setGetRemoteScriptStatusConnectorResponse(
          new SentinelOneDataGenerator('seed').generateSentinelOneApiRemoteScriptStatusResponse({
            status: 'pending',
          })
        );
        await s1ActionsClient.processPendingActions(processPendingActionsOptions);

        expect(processPendingActionsOptions.addToQueue).not.toHaveBeenCalled();
      });

      it.each`
        s1ScriptStatus | expectedResponseActionResponse
        ${'canceled'}  | ${'failure'}
        ${'expired'}   | ${'failure'}
        ${'failed'}    | ${'failure'}
        ${'completed'} | ${'success'}
      `(
        'should create $expectedResponseActionResponse response when S1 script status is $s1ScriptStatus',
        async ({ s1ScriptStatus, expectedResponseActionResponse }) => {
          const s1ScriptStatusResponse = new SentinelOneDataGenerator(
            'seed'
          ).generateSentinelOneApiRemoteScriptStatusResponse({
            status: s1ScriptStatus,
          });
          setGetRemoteScriptStatusConnectorResponse(s1ScriptStatusResponse);
          await s1ActionsClient.processPendingActions(processPendingActionsOptions);

          if (expectedResponseActionResponse === 'failure') {
            expect(processPendingActionsOptions.addToQueue).toHaveBeenCalledWith(
              expect.objectContaining({
                error: {
                  message: expect.any(String),
                },
              })
            );
          } else {
            expect(processPendingActionsOptions.addToQueue).toHaveBeenCalledWith(
              expect.objectContaining({
                meta: { taskId: s1ScriptStatusResponse.data[0].id },
                error: undefined,
                EndpointActions: expect.objectContaining({
                  data: expect.objectContaining({
                    output: {
                      type: 'json',
                      content: responseOutputContent,
                    },
                  }),
                }),
              })
            );
          }
        }
      );

      it.each([
        'created',
        'pending',
        'pending_user_action',
        'scheduled',
        'in_progress',
        'partially_completed',
      ])('should leave action pending when S1 script status is %s', async (s1ScriptStatus) => {
        setGetRemoteScriptStatusConnectorResponse(
          new SentinelOneDataGenerator('seed').generateSentinelOneApiRemoteScriptStatusResponse({
            status: s1ScriptStatus as SentinelOneRemoteScriptExecutionStatus['status'],
          })
        );
        await s1ActionsClient.processPendingActions(processPendingActionsOptions);

        expect(processPendingActionsOptions.addToQueue).not.toHaveBeenCalled();
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
            zipPassCode: RESPONSE_ACTIONS_ZIP_PASSCODE.sentinel_one,
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
      connectorActionsMock =
        classConstructorOptions.connectorActions as DeeplyMockedKeys<NormalizedExternalConnectorClient>;
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

  describe('#getFileInfo()', () => {
    beforeEach(() => {
      const s1DataGenerator = new SentinelOneDataGenerator('seed');
      const actionRequestsSearchResponse = s1DataGenerator.toEsSearchResponse([
        s1DataGenerator.generateActionEsHit({
          agent: { id: '123' },
          EndpointActions: { data: { command: 'get-file' } },
          meta: {
            agentId: 's1-agent-a',
            agentUUID: 'agent-uuid-1',
            hostName: 's1-host-name',
          },
        }),
      ]);

      applyEsClientSearchMock({
        esClientMock: classConstructorOptions.esClient,
        index: ENDPOINT_ACTIONS_INDEX,
        response: actionRequestsSearchResponse,
      });

      // @ts-expect-error updating readonly attribute
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneGetFileEnabled =
        true;
    });

    it('should throw error if feature flag is disabled', async () => {
      // @ts-expect-error updating readonly attribute
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneGetFileEnabled =
        false;

      await expect(s1ActionsClient.getFileInfo('acb', '123')).rejects.toThrow(
        'File downloads are not supported for sentinel_one agent type. Feature disabled'
      );
    });

    it('should throw error if action id is not for an agent type of sentinelOne', async () => {
      applyEsClientSearchMock({
        esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
        index: ENDPOINT_ACTIONS_INDEX,
        response: SentinelOneDataGenerator.toEsSearchResponse([
          new SentinelOneDataGenerator('seed').generateActionEsHit({
            agent: { id: '123' },
            EndpointActions: { data: { command: 'get-file' }, input_type: 'endpoint' },
          }),
        ]),
      });

      await expect(s1ActionsClient.getFileInfo('abc', '123')).rejects.toThrow(
        'Action id [abc] with agent type of [sentinel_one] not found'
      );
    });

    it('should return file info with with status of AWAITING_UPLOAD if action is still pending', async () => {
      applyEsClientSearchMock({
        esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
        index: ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
        response: SentinelOneDataGenerator.toEsSearchResponse([]),
      });

      await expect(s1ActionsClient.getFileInfo('abc', '123')).resolves.toEqual({
        actionId: 'abc',
        agentId: '123',
        agentType: 'sentinel_one',
        created: '',
        id: '123',
        mimeType: '',
        name: '',
        size: 0,
        status: 'AWAITING_UPLOAD',
      });
    });

    it('should return expected file information', async () => {
      applyEsClientSearchMock({
        esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
        index: ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
        response: SentinelOneDataGenerator.toEsSearchResponse([]),
      });
    });
  });

  describe('#getFileDownload()', () => {
    let s1DataGenerator: SentinelOneDataGenerator;

    beforeEach(() => {
      s1DataGenerator = new SentinelOneDataGenerator('seed');

      // @ts-expect-error updating readonly attribute
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneGetFileEnabled =
        true;

      const actionRequestsSearchResponse = s1DataGenerator.toEsSearchResponse([
        s1DataGenerator.generateActionEsHit({
          agent: { id: '123' },
          EndpointActions: { data: { command: 'get-file' } },
          meta: {
            agentId: 's1-agent-a',
            agentUUID: 'agent-uuid-1',
            hostName: 's1-host-name',
          },
        }),
      ]);

      applyEsClientSearchMock({
        esClientMock: classConstructorOptions.esClient,
        index: ENDPOINT_ACTIONS_INDEX,
        response: actionRequestsSearchResponse,
      });

      const esHit = s1DataGenerator.generateResponseEsHit({
        agent: { id: '123' },
        EndpointActions: { data: { command: 'get-file' } },
        meta: {
          activityLogEntryId: 'activity-1',
          elasticDocId: 'esdoc-1',
          downloadUrl: '/some/url',
          createdAt: '2024-05-09',
          filename: 'foo.zip',
        },
      });

      applyEsClientSearchMock({
        esClientMock: classConstructorOptions.esClient,
        index: ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
        response: s1DataGenerator.toEsSearchResponse([esHit]),
      });

      (connectorActionsMock.execute as jest.Mock).mockImplementation(
        (options: NormalizedExternalConnectorClientExecuteOptions) => {
          if (options.params.subAction === SUB_ACTION.DOWNLOAD_AGENT_FILE) {
            return {
              data: Readable.from(['test']),
            };
          }
        }
      );
    });

    it('should throw error if feature flag is disabled', async () => {
      // @ts-expect-error updating readonly attribute
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneGetFileEnabled =
        false;
      // @ts-expect-error updating readonly attribute
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneProcessesEnabled =
        false;

      await expect(s1ActionsClient.getFileDownload('acb', '123')).rejects.toThrow(
        'File downloads are not supported for sentinel_one agent type. Feature disabled'
      );
    });

    it('should throw error if action id is not for an agent type of sentinelOne', async () => {
      applyEsClientSearchMock({
        esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
        index: ENDPOINT_ACTIONS_INDEX,
        response: SentinelOneDataGenerator.toEsSearchResponse([
          s1DataGenerator.generateActionEsHit({
            agent: { id: '123' },
            EndpointActions: { data: { command: 'get-file' }, input_type: 'endpoint' },
          }),
        ]),
      });

      await expect(s1ActionsClient.getFileDownload('abc', '123')).rejects.toThrow(
        'Action id [abc] with agent type of [sentinel_one] not found'
      );
    });

    it('should throw error if action is still pending for the given agent id', async () => {
      applyEsClientSearchMock({
        esClientMock: classConstructorOptions.esClient,
        index: ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
        response: s1DataGenerator.toEsSearchResponse([]),
      });
      await expect(s1ActionsClient.getFileDownload('abc', '123')).rejects.toThrow(
        'Action ID [abc] for agent ID [abc] is still pending'
      );
    });

    it('should throw error if the action response ES Doc is missing required data', async () => {
      applyEsClientSearchMock({
        esClientMock: classConstructorOptions.esClient,
        index: ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
        response: s1DataGenerator.toEsSearchResponse([
          s1DataGenerator.generateResponseEsHit({
            agent: { id: '123' },
            EndpointActions: { data: { command: 'get-file' } },
            meta: { activityLogEntryId: undefined },
          }),
        ]),
      });

      await expect(s1ActionsClient.getFileDownload('abc', '123')).rejects.toThrow(
        'Unable to retrieve file from SentinelOne. Response ES document is missing [meta.activityLogEntryId]'
      );
    });

    it('should call SentinelOne connector to get file download Readable stream', async () => {
      await s1ActionsClient.getFileDownload('abc', '123');

      expect(connectorActionsMock.execute).toHaveBeenCalledWith({
        params: {
          subAction: 'downloadAgentFile',
          subActionParams: {
            activityId: 'activity-1',
            agentUUID: '123',
          },
        },
      });
    });

    it('should throw an error if call to SentinelOne did not return a Readable stream', async () => {
      (connectorActionsMock.execute as jest.Mock).mockReturnValue({ data: undefined });

      await expect(s1ActionsClient.getFileDownload('abc', '123')).rejects.toThrow(
        'Unable to establish a file download Readable stream with SentinelOne for response action [get-file] [abc]'
      );
    });

    it('should return expected data', async () => {
      await expect(s1ActionsClient.getFileDownload('abc', '123')).resolves.toEqual({
        stream: expect.any(Readable),
        fileName: 'foo.zip',
        mimeType: undefined,
      });
    });
  });

  describe('#killProcess()', () => {
    let killProcessActionRequest: KillOrSuspendProcessRequestBody;

    beforeEach(() => {
      // @ts-expect-error readonly prop assignment
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneKillProcessEnabled =
        true;

      killProcessActionRequest = responseActionsClientMock.createKillProcessOptions({
        // @ts-expect-error TS2322 due to type being overloaded to handle kill/suspend process and specific option for S1
        parameters: { process_name: 'foo' },
      });
    });

    it('should throw an error if feature flag is disabled', async () => {
      // @ts-expect-error readonly prop assignment
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneKillProcessEnabled =
        false;

      await expect(s1ActionsClient.killProcess(killProcessActionRequest)).rejects.toThrow(
        `kill-process not supported for sentinel_one agent type. Feature disabled`
      );
    });

    it('should throw an error if `process_name` is not defined (manual mode)', async () => {
      // @ts-expect-error
      killProcessActionRequest.parameters.process_name = '';

      await expect(s1ActionsClient.killProcess(killProcessActionRequest)).rejects.toThrow(
        '[body.parameters.process_name]: missing parameter or value is empty'
      );
    });

    it('should still create action at error if something goes wrong in automated mode', async () => {
      // @ts-expect-error
      killProcessActionRequest.parameters.process_name = '';
      classConstructorOptions.isAutomated = true;
      classConstructorOptions.connectorActions =
        responseActionsClientMock.createNormalizedExternalConnectorClient(
          sentinelOneMock.createConnectorActionsClient()
        );
      s1ActionsClient = new SentinelOneActionsClient(classConstructorOptions);
      await s1ActionsClient.killProcess(killProcessActionRequest);

      expect(classConstructorOptions.esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            error: {
              message: '[body.parameters.process_name]: missing parameter or value is empty',
            },
          }),
        }),
        { meta: true }
      );
    });

    it('should retrieve script execution information from S1 using host OS', async () => {
      await s1ActionsClient.killProcess(killProcessActionRequest);

      expect(connectorActionsMock.execute as jest.Mock).toHaveBeenCalledWith({
        params: {
          subAction: SUB_ACTION.GET_REMOTE_SCRIPTS,
          subActionParams: {
            osTypes: 'linux',
            query: 'terminate',
            scriptType: 'action',
          },
        },
      });
    });

    it('should throw error if unable to retrieve S1 script information', async () => {
      const executeMockImplementation = connectorActionsMock.execute.getMockImplementation()!;
      connectorActionsMock.execute.mockImplementation(async (options) => {
        if (options.params.subAction === SUB_ACTION.GET_REMOTE_SCRIPTS) {
          return responseActionsClientMock.createConnectorActionExecuteResponse({
            data: { data: [] },
          });
        }
        return executeMockImplementation.call(connectorActionsMock, options);
      });

      await expect(s1ActionsClient.killProcess(killProcessActionRequest)).rejects.toThrow(
        'Unable to find a script from SentinelOne to handle [kill-process] response action for host running [linux])'
      );
    });

    it('should send execute script request to S1 for kill-process', async () => {
      await s1ActionsClient.killProcess(killProcessActionRequest);

      expect(connectorActionsMock.execute).toHaveBeenCalledWith({
        params: {
          subAction: 'executeScript',
          subActionParams: {
            filter: { uuids: '1-2-3' },
            script: {
              inputParams: '--terminate --processes "foo" --force',
              outputDestination: 'SentinelCloud',
              requiresApproval: false,
              scriptId: '1466645476786791838',
              taskDescription: expect.stringContaining(
                'Action triggered from Elastic Security by user [foo] for action [kill-process'
              ),
            },
          },
        },
      });
    });

    it('should return action details on success', async () => {
      await s1ActionsClient.killProcess(killProcessActionRequest);

      expect(getActionDetailsByIdMock).toHaveBeenCalled();
    });

    it('should create action request doc with expected meta info', async () => {
      await s1ActionsClient.killProcess(killProcessActionRequest);

      expect(classConstructorOptions.esClient.index).toHaveBeenCalledWith(
        {
          document: {
            '@timestamp': expect.any(String),
            EndpointActions: {
              action_id: expect.any(String),
              data: {
                command: 'kill-process',
                comment: 'test comment',
                parameters: { process_name: 'foo' },
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
              parentTaskId: 'task-789',
            },
          },
          index: ENDPOINT_ACTIONS_INDEX,
          refresh: 'wait_for',
        },
        { meta: true }
      );
    });

    it('should update cases', async () => {
      killProcessActionRequest = {
        ...killProcessActionRequest,
        case_ids: ['case-1'],
      };
      await s1ActionsClient.killProcess(killProcessActionRequest);

      expect(classConstructorOptions.casesClient?.attachments.bulkCreate).toHaveBeenCalled();
    });
  });

  describe('#runningProcesses()', () => {
    let processesActionRequest: GetProcessesRequestBody;

    beforeEach(() => {
      // @ts-expect-error readonly prop assignment
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneProcessesEnabled =
        true;

      processesActionRequest = responseActionsClientMock.createRunningProcessesOptions();
    });

    it('should error if feature flag is disabled', async () => {
      // @ts-expect-error readonly prop assignment
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneProcessesEnabled =
        false;

      await expect(s1ActionsClient.runningProcesses(processesActionRequest)).rejects.toThrow(
        `processes not supported for sentinel_one agent type. Feature disabled`
      );
    });

    it('should error if host is running Windows', async () => {
      connectorActionsMock.execute.mockResolvedValue(
        responseActionsClientMock.createConnectorActionExecuteResponse({
          data: sentinelOneMock.createGetAgentsResponse([
            sentinelOneMock.createSentinelOneAgentDetails({ osType: 'windows' }),
          ]),
        })
      );

      await expect(s1ActionsClient.runningProcesses(processesActionRequest)).rejects.toThrow(
        'Retrieval of running processes for Windows host is not supported by SentinelOne'
      );
    });

    it('should retrieve script execution information from S1 using host OS', async () => {
      await s1ActionsClient.runningProcesses(processesActionRequest);

      expect(connectorActionsMock.execute).toHaveBeenCalledWith({
        params: {
          subAction: 'getRemoteScripts',
          subActionParams: {
            osTypes: 'linux',
            query: 'process list',
            scriptType: 'dataCollection',
          },
        },
      });
    });

    it('should error if unable to get S1 script information', async () => {
      const executeMockImplementation = connectorActionsMock.execute.getMockImplementation()!;
      connectorActionsMock.execute.mockImplementation(async (options) => {
        if (options.params.subAction === SUB_ACTION.GET_REMOTE_SCRIPTS) {
          return responseActionsClientMock.createConnectorActionExecuteResponse({
            data: { data: [] },
          });
        }
        return executeMockImplementation.call(connectorActionsMock, options);
      });

      await expect(s1ActionsClient.runningProcesses(processesActionRequest)).rejects.toThrow(
        'Unable to find a script from SentinelOne to handle [running-processes] response action for host running [linux])'
      );
    });

    it('should send execute script request to S1 for process list', async () => {
      await s1ActionsClient.runningProcesses(processesActionRequest);

      expect(connectorActionsMock.execute).toHaveBeenCalledWith({
        params: {
          subAction: 'executeScript',
          subActionParams: {
            filter: { uuids: '1-2-3' },
            script: {
              inputParams: '',
              outputDestination: 'SentinelCloud',
              requiresApproval: false,
              scriptId: '1466645476786791838',
              taskDescription: expect.stringContaining(
                'Action triggered from Elastic Security by user [foo] for action [running-processes'
              ),
            },
          },
        },
      });
    });

    it('should return action details on success', async () => {
      await s1ActionsClient.runningProcesses(processesActionRequest);

      expect(getActionDetailsByIdMock).toHaveBeenCalled();
    });

    it('should create action request doc with expected meta info', async () => {
      await s1ActionsClient.runningProcesses(processesActionRequest);

      expect(classConstructorOptions.esClient.index).toHaveBeenCalledWith(
        {
          document: {
            '@timestamp': expect.any(String),
            EndpointActions: {
              action_id: expect.any(String),
              data: {
                command: 'running-processes',
                comment: 'test comment',
                hosts: { '1-2-3': { name: 'sentinelone-1460' } },
                parameters: undefined,
              },
              expiration: expect.any(String),
              input_type: 'sentinel_one',
              type: 'INPUT_ACTION',
            },
            agent: { id: ['1-2-3'] },
            meta: {
              agentId: '1845174760470303882',
              agentUUID: '1-2-3',
              hostName: 'sentinelone-1460',
              parentTaskId: 'task-789',
            },
            user: { id: 'foo' },
          },
          index: '.logs-endpoint.actions-default',
          refresh: 'wait_for',
        },
        { meta: true }
      );
    });

    it('should update cases', async () => {
      processesActionRequest = {
        ...processesActionRequest,
        case_ids: ['case-1'],
      };
      await s1ActionsClient.runningProcesses(processesActionRequest);

      expect(classConstructorOptions.casesClient?.attachments.bulkCreate).toHaveBeenCalled();
    });

    it('should still create action request when running in automated mode', async () => {
      classConstructorOptions.isAutomated = true;
      classConstructorOptions.connectorActions =
        responseActionsClientMock.createNormalizedExternalConnectorClient(
          sentinelOneMock.createConnectorActionsClient()
        );
      s1ActionsClient = new SentinelOneActionsClient(classConstructorOptions);
      await s1ActionsClient.runningProcesses(processesActionRequest);

      expect(classConstructorOptions.esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            error: { message: 'Action [running-processes] not supported' },
          }),
        }),
        { meta: true }
      );
    });
  });
});
