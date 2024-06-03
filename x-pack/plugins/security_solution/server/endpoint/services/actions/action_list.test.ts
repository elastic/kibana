/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type {
  EndpointActionResponse,
  LogsEndpointAction,
  LogsEndpointActionResponse,
} from '../../../../common/endpoint/types';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';
import { getActionList, getActionListByStatus } from './action_list';
import { CustomHttpRequestError } from '../../../utils/custom_http_request_error';
import {
  applyActionListEsSearchMock,
  createActionRequestsEsSearchResultsMock,
  createActionResponsesEsSearchResultsMock,
} from './mocks';
import type { MockedLogger } from '@kbn/logging-mocks';
import { EndpointAppContextService } from '../../endpoint_app_context_services';
import {
  createMockEndpointAppContextServiceSetupContract,
  createMockEndpointAppContextServiceStartContract,
} from '../../mocks';
import type { ResponseActionAgentType } from '../../../../common/endpoint/service/response_actions/constants';

describe('When using `getActionList()', () => {
  let esClient: ElasticsearchClientMock;
  let logger: MockedLogger;
  let endpointActionGenerator: EndpointActionGenerator;
  let actionRequests: estypes.SearchResponse<LogsEndpointAction>;
  let actionResponses: estypes.SearchResponse<EndpointActionResponse | LogsEndpointActionResponse>;
  let endpointAppContextService: EndpointAppContextService;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createScopedClusterClient().asInternalUser;
    logger = loggingSystemMock.createLogger();
    endpointActionGenerator = new EndpointActionGenerator('seed');
    endpointAppContextService = new EndpointAppContextService();
    endpointAppContextService.setup(createMockEndpointAppContextServiceSetupContract());
    endpointAppContextService.start(createMockEndpointAppContextServiceStartContract());

    actionRequests = createActionRequestsEsSearchResultsMock();
    actionResponses = createActionResponsesEsSearchResultsMock();

    applyActionListEsSearchMock(esClient, actionRequests, actionResponses);
  });

  afterEach(() => {
    endpointAppContextService.stop();
  });

  it('should return expected output', async () => {
    const doc = actionRequests.hits.hits[0]._source;
    // mock metadataService.findHostMetadataForFleetAgents resolved value
    (endpointAppContextService.getEndpointMetadataService as jest.Mock) = jest
      .fn()
      .mockReturnValue({
        findHostMetadataForFleetAgents: jest.fn().mockResolvedValue([
          {
            agent: {
              id: 'agent-a',
            },
            host: {
              hostname: 'Host-agent-a',
            },
          },
        ]),
      });
    await expect(
      getActionList({
        esClient,
        logger,
        metadataService: endpointAppContextService.getEndpointMetadataService(),
        page: 1,
        pageSize: 10,
      })
    ).resolves.toEqual({
      page: 1,
      pageSize: 10,
      commands: undefined,
      userIds: undefined,
      startDate: undefined,
      elasticAgentIds: undefined,
      endDate: undefined,
      data: [
        {
          action: '123',
          agents: ['agent-a'],
          agentType: 'endpoint',
          hosts: { 'agent-a': { name: 'Host-agent-a' } },
          command: 'kill-process',
          completedAt: '2022-04-30T16:08:47.449Z',
          wasSuccessful: true,
          errors: undefined,
          id: '123',
          isCompleted: true,
          isExpired: false,
          startedAt: '2022-04-27T16:08:47.449Z',
          status: 'successful',
          comment: doc?.EndpointActions.data.comment,
          createdBy: doc?.user.id,
          parameters: doc?.EndpointActions.data.parameters,
          agentState: {
            'agent-a': {
              completedAt: '2022-04-30T16:08:47.449Z',
              isCompleted: true,
              wasSuccessful: true,
            },
          },
          outputs: {
            'agent-a': {
              content: {
                code: 'ra_get-file_success_done',
                contents: [
                  {
                    file_name: 'bad_file.txt',
                    path: '/some/path/bad_file.txt',
                    sha256: '9558c5cb39622e9b3653203e772b129d6c634e7dbd7af1b244352fc1d704601f',
                    size: 1234,
                    type: 'file',
                  },
                ],
                zip_size: 123,
              },
              type: 'json',
            },
          },
        },
      ],
      total: 1,
    });
  });

  it('should return expected `output` for given actions', async () => {
    const doc = actionRequests.hits.hits[0]._source;
    // mock metadataService.findHostMetadataForFleetAgents resolved value
    (endpointAppContextService.getEndpointMetadataService as jest.Mock) = jest
      .fn()
      .mockReturnValue({
        findHostMetadataForFleetAgents: jest.fn().mockResolvedValue([
          {
            agent: {
              id: 'agent-a',
            },
            host: {
              hostname: 'Host-agent-a',
            },
          },
        ]),
      });
    await expect(
      getActionList({
        esClient,
        logger,
        metadataService: endpointAppContextService.getEndpointMetadataService(),
        page: 1,
        pageSize: 10,
        withOutputs: ['123'],
      })
    ).resolves.toEqual({
      page: 1,
      pageSize: 10,
      commands: undefined,
      userIds: undefined,
      startDate: undefined,
      elasticAgentIds: undefined,
      endDate: undefined,
      data: [
        {
          action: '123',
          agents: ['agent-a'],
          agentType: 'endpoint',
          hosts: { 'agent-a': { name: 'Host-agent-a' } },
          command: 'kill-process',
          completedAt: '2022-04-30T16:08:47.449Z',
          wasSuccessful: true,
          errors: undefined,
          id: '123',
          isCompleted: true,
          isExpired: false,
          startedAt: '2022-04-27T16:08:47.449Z',
          status: 'successful',
          outputs: {
            'agent-a': {
              content: {
                code: 'ra_get-file_success_done',
                contents: [
                  {
                    file_name: 'bad_file.txt',
                    path: '/some/path/bad_file.txt',
                    sha256: '9558c5cb39622e9b3653203e772b129d6c634e7dbd7af1b244352fc1d704601f',
                    size: 1234,
                    type: 'file',
                  },
                ],
                zip_size: 123,
              },
              type: 'json',
            },
          },
          comment: doc?.EndpointActions.data.comment,
          createdBy: doc?.user.id,
          parameters: doc?.EndpointActions.data.parameters,
          agentState: {
            'agent-a': {
              completedAt: '2022-04-30T16:08:47.449Z',
              isCompleted: true,
              wasSuccessful: true,
            },
          },
        },
      ],
      total: 1,
    });
  });

  it('should return expected output for multiple agent ids', async () => {
    const agentIds = ['agent-a', 'agent-b', 'agent-x'];
    actionRequests = createActionRequestsEsSearchResultsMock(agentIds);
    actionResponses = createActionResponsesEsSearchResultsMock(agentIds);

    applyActionListEsSearchMock(esClient, actionRequests, actionResponses);
    const doc = actionRequests.hits.hits[0]._source;
    // mock metadataService.findHostMetadataForFleetAgents resolved value
    (endpointAppContextService.getEndpointMetadataService as jest.Mock) = jest
      .fn()
      .mockReturnValue({
        findHostMetadataForFleetAgents: jest.fn().mockResolvedValue([
          {
            agent: {
              id: 'agent-a',
            },
            host: {
              hostname: 'Host-agent-a',
            },
          },
          {
            agent: {
              id: 'agent-b',
            },
            host: {
              hostname: 'Host-agent-b',
            },
          },
        ]),
      });
    await expect(
      getActionList({
        esClient,
        logger,
        metadataService: endpointAppContextService.getEndpointMetadataService(),
        page: 1,
        pageSize: 10,
      })
    ).resolves.toEqual({
      page: 1,
      pageSize: 10,
      commands: undefined,
      userIds: undefined,
      startDate: undefined,
      elasticAgentIds: undefined,
      endDate: undefined,
      statuses: undefined,
      data: [
        {
          action: '123',
          agents: ['agent-a', 'agent-b', 'agent-x'],
          agentType: 'endpoint',
          hosts: {
            'agent-a': { name: 'Host-agent-a' },
            'agent-b': { name: 'Host-agent-b' },
            'agent-x': { name: '' },
          },
          command: 'kill-process',
          completedAt: undefined,
          wasSuccessful: false,
          errors: undefined,
          id: '123',
          isCompleted: false,
          isExpired: true,
          startedAt: '2022-04-27T16:08:47.449Z',
          status: 'failed',
          comment: doc?.EndpointActions.data.comment,
          createdBy: doc?.user.id,
          parameters: doc?.EndpointActions.data.parameters,
          agentState: {
            'agent-a': {
              completedAt: '2022-04-30T16:08:47.449Z',
              isCompleted: true,
              wasSuccessful: true,
              errors: undefined,
            },
            'agent-b': {
              completedAt: undefined,
              isCompleted: false,
              wasSuccessful: false,
              errors: undefined,
            },
            'agent-x': {
              completedAt: undefined,
              isCompleted: false,
              wasSuccessful: false,
              errors: undefined,
            },
          },
          outputs: {},
        },
      ],
      total: 1,
    });
  });

  it('should call query with expected filters when querying for Action Request', async () => {
    // mock metadataService.findHostMetadataForFleetAgents resolved value
    (endpointAppContextService.getEndpointMetadataService as jest.Mock) = jest
      .fn()
      .mockReturnValue({
        findHostMetadataForFleetAgents: jest.fn().mockResolvedValue([]),
      });
    await getActionList({
      esClient,
      logger,
      metadataService: endpointAppContextService.getEndpointMetadataService(),
      agentTypes: ['endpoint'] as ResponseActionAgentType[],
      elasticAgentIds: ['123'],
      pageSize: 20,
      startDate: 'now-10d',
      endDate: 'now',
      commands: ['isolate', 'unisolate', 'get-file'],
      userIds: ['*elastic*'],
    });

    expect(esClient.search).toHaveBeenNthCalledWith(
      1,
      {
        query: {
          bool: {
            must: [
              {
                bool: {
                  filter: [
                    {
                      range: {
                        '@timestamp': {
                          gte: 'now-10d',
                        },
                      },
                    },
                    {
                      range: {
                        '@timestamp': {
                          lte: 'now',
                        },
                      },
                    },
                    {
                      terms: {
                        'data.command': ['isolate', 'unisolate', 'get-file'],
                      },
                    },
                    {
                      terms: {
                        input_type: ['endpoint'],
                      },
                    },
                    {
                      terms: {
                        agents: ['123'],
                      },
                    },
                  ],
                },
              },
              {
                bool: {
                  should: [
                    {
                      query_string: {
                        fields: ['user_id'],
                        query: '*elastic*',
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
        sort: [
          {
            '@timestamp': {
              order: 'desc',
            },
          },
        ],
        from: 0,
        index: '.logs-endpoint.actions-default',
        size: 20,
      },
      { ignore: [404] }
    );
  });

  it('should call search with exact usernames when no wildcards are present', async () => {
    // mock metadataService.findHostMetadataForFleetAgents resolved value
    (endpointAppContextService.getEndpointMetadataService as jest.Mock) = jest
      .fn()
      .mockReturnValue({
        findHostMetadataForFleetAgents: jest.fn().mockResolvedValue([]),
      });
    await getActionList({
      esClient,
      logger,
      metadataService: endpointAppContextService.getEndpointMetadataService(),
      pageSize: 10,
      startDate: 'now-1d',
      endDate: 'now',
      userIds: ['elastic', 'kibana'],
    });

    expect(esClient.search).toHaveBeenNthCalledWith(
      1,
      {
        query: {
          bool: {
            must: [
              {
                bool: {
                  filter: [
                    {
                      range: {
                        '@timestamp': {
                          gte: 'now-1d',
                        },
                      },
                    },
                    {
                      range: {
                        '@timestamp': {
                          lte: 'now',
                        },
                      },
                    },
                  ],
                },
              },
              {
                bool: {
                  should: [
                    {
                      bool: {
                        should: [
                          {
                            match: {
                              user_id: 'elastic',
                            },
                          },
                        ],
                        minimum_should_match: 1,
                      },
                    },
                    {
                      bool: {
                        should: [
                          {
                            match: {
                              user_id: 'kibana',
                            },
                          },
                        ],
                        minimum_should_match: 1,
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
        sort: [
          {
            '@timestamp': {
              order: 'desc',
            },
          },
        ],
        from: 0,
        index: '.logs-endpoint.actions-default',
        size: 10,
      },
      { ignore: [404] }
    );
  });

  it('should return an empty array if no actions are found', async () => {
    // mock metadataService.findHostMetadataForFleetAgents resolved value
    (endpointAppContextService.getEndpointMetadataService as jest.Mock) = jest
      .fn()
      .mockReturnValue({
        findHostMetadataForFleetAgents: jest.fn().mockResolvedValue([]),
      });
    actionRequests.hits.hits = [];
    (actionRequests.hits.total as estypes.SearchTotalHits).value = 0;
    (actionResponses.hits.total as estypes.SearchTotalHits).value = 0;
    actionRequests = endpointActionGenerator.toEsSearchResponse([]);

    await expect(
      getActionList({
        esClient,
        logger,
        metadataService: endpointAppContextService.getEndpointMetadataService(),
      })
    ).resolves.toEqual(
      expect.objectContaining({
        commands: undefined,
        data: [],
        elasticAgentIds: undefined,
        endDate: undefined,
        page: 1,
        pageSize: 10,
        startDate: undefined,
        total: 0,
        userIds: undefined,
      })
    );
  });

  it('should have `isExpired` as `true` if NOT complete and expiration is in the past', async () => {
    // mock metadataService.findHostMetadataForFleetAgents resolved value
    (endpointAppContextService.getEndpointMetadataService as jest.Mock) = jest
      .fn()
      .mockReturnValue({
        findHostMetadataForFleetAgents: jest.fn().mockResolvedValue([]),
      });
    (
      actionRequests.hits.hits[0]._source as LogsEndpointAction
    ).EndpointActions.expiration = `2021-04-30T16:08:47.449Z`;
    actionResponses.hits.hits.pop(); // remove the endpoint response

    await expect(
      await (
        await getActionList({
          esClient,
          logger,
          metadataService: endpointAppContextService.getEndpointMetadataService(),
          elasticAgentIds: ['123'],
        })
      ).data[0]
    ).toEqual(
      expect.objectContaining({
        isExpired: true,
        isCompleted: false,
      })
    );
  });

  it('should have `isExpired` as `false` if complete and expiration is in the past', async () => {
    // mock metadataService.findHostMetadataForFleetAgents resolved value
    (endpointAppContextService.getEndpointMetadataService as jest.Mock) = jest
      .fn()
      .mockReturnValue({
        findHostMetadataForFleetAgents: jest.fn().mockResolvedValue([]),
      });
    (
      actionRequests.hits.hits[0]._source as LogsEndpointAction
    ).EndpointActions.expiration = `2021-04-30T16:08:47.449Z`;

    await expect(
      await (
        await getActionList({
          esClient,
          logger,
          metadataService: endpointAppContextService.getEndpointMetadataService(),
          elasticAgentIds: ['123'],
        })
      ).data[0]
    ).toEqual(
      expect.objectContaining({
        isExpired: false,
        isCompleted: true,
      })
    );
  });

  it('should show status as `completed` if NOT expired and action IS completed AND is successful', async () => {
    // mock metadataService.findHostMetadataForFleetAgents resolved value
    (endpointAppContextService.getEndpointMetadataService as jest.Mock) = jest
      .fn()
      .mockReturnValue({
        findHostMetadataForFleetAgents: jest.fn().mockResolvedValue([]),
      });
    (
      actionRequests.hits.hits[0]._source as LogsEndpointAction
    ).EndpointActions.expiration = `2021-04-30T16:08:47.449Z`;

    await expect(
      await (
        await getActionList({
          esClient,
          logger,
          metadataService: endpointAppContextService.getEndpointMetadataService(),
          elasticAgentIds: ['123'],
        })
      ).data[0]
    ).toEqual(
      expect.objectContaining({
        isExpired: false,
        isCompleted: true,
        wasSuccessful: true,
        status: 'successful',
      })
    );
  });

  it('should show status as `failed` if IS expired', async () => {
    // mock metadataService.findHostMetadataForFleetAgents resolved value
    (endpointAppContextService.getEndpointMetadataService as jest.Mock) = jest
      .fn()
      .mockReturnValue({
        findHostMetadataForFleetAgents: jest.fn().mockResolvedValue([]),
      });
    (
      actionRequests.hits.hits[0]._source as LogsEndpointAction
    ).EndpointActions.expiration = `2021-04-30T16:08:47.449Z`;
    actionResponses.hits.hits.pop(); // remove the endpoint response

    await expect(
      await (
        await getActionList({
          esClient,
          logger,
          metadataService: endpointAppContextService.getEndpointMetadataService(),
          elasticAgentIds: ['123'],
        })
      ).data[0]
    ).toEqual(
      expect.objectContaining({
        isExpired: true,
        isCompleted: false,
        wasSuccessful: false,
        status: 'failed',
      })
    );
  });

  it('should show status as `failed` if IS completed AND was unsuccessful', async () => {
    // mock metadataService.findHostMetadataForFleetAgents resolved value
    (endpointAppContextService.getEndpointMetadataService as jest.Mock) = jest
      .fn()
      .mockReturnValue({
        findHostMetadataForFleetAgents: jest.fn().mockResolvedValue([]),
      });
    (
      actionRequests.hits.hits[0]._source as LogsEndpointAction
    ).EndpointActions.expiration = `2021-04-30T16:08:47.449Z`;
    (actionResponses.hits.hits[0]._source as LogsEndpointActionResponse).error = Error(
      'Some error in action response'
    );

    await expect(
      await (
        await getActionList({
          esClient,
          logger,
          metadataService: endpointAppContextService.getEndpointMetadataService(),
          elasticAgentIds: ['123'],
        })
      ).data[0]
    ).toEqual(
      expect.objectContaining({
        isExpired: false,
        isCompleted: true,
        wasSuccessful: false,
        status: 'failed',
      })
    );
  });

  it('should show status as `pending` if no response and NOT expired', async () => {
    // mock metadataService.findHostMetadataForFleetAgents resolved value
    (endpointAppContextService.getEndpointMetadataService as jest.Mock) = jest
      .fn()
      .mockReturnValue({
        findHostMetadataForFleetAgents: jest.fn().mockResolvedValue([]),
      });
    (actionRequests.hits.hits[0]._source as LogsEndpointAction).EndpointActions.expiration =
      new Date(new Date().setDate(new Date().getDate() + 5)).toISOString();
    // remove response
    actionResponses.hits.hits.pop();

    await expect(
      await (
        await getActionList({
          esClient,
          logger,
          metadataService: endpointAppContextService.getEndpointMetadataService(),
          elasticAgentIds: ['123'],
        })
      ).data[0]
    ).toEqual(
      expect.objectContaining({
        isExpired: false,
        isCompleted: false,
        wasSuccessful: false,
        status: 'pending',
      })
    );
  });

  it('should throw custom errors', async () => {
    // mock metadataService.findHostMetadataForFleetAgents resolved value
    (endpointAppContextService.getEndpointMetadataService as jest.Mock) = jest
      .fn()
      .mockReturnValue({
        findHostMetadataForFleetAgents: jest.fn().mockResolvedValue([]),
      });
    const error = new Error('Some odd error!');

    esClient.search.mockImplementation(async () => {
      return Promise.reject(error);
    });
    const getActionListPromise = getActionList({
      esClient,
      logger,
      metadataService: endpointAppContextService.getEndpointMetadataService(),
    });

    await expect(getActionListPromise).rejects.toThrowError(
      'Unknown error while fetching action requests'
    );
    await expect(getActionListPromise).rejects.toBeInstanceOf(CustomHttpRequestError);
  });
});

describe('When using `getActionListByStatus()', () => {
  let esClient: ElasticsearchClientMock;
  let logger: MockedLogger;
  // let endpointActionGenerator: EndpointActionGenerator;
  let actionRequests: estypes.SearchResponse<LogsEndpointAction>;
  let actionResponses: estypes.SearchResponse<EndpointActionResponse | LogsEndpointActionResponse>;
  let endpointAppContextService: EndpointAppContextService;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createScopedClusterClient().asInternalUser;
    logger = loggingSystemMock.createLogger();
    // endpointActionGenerator = new EndpointActionGenerator('seed');
    endpointAppContextService = new EndpointAppContextService();
    endpointAppContextService.setup(createMockEndpointAppContextServiceSetupContract());
    endpointAppContextService.start(createMockEndpointAppContextServiceStartContract());

    actionRequests = createActionRequestsEsSearchResultsMock(undefined);
    actionResponses = createActionResponsesEsSearchResultsMock();

    applyActionListEsSearchMock(esClient, actionRequests, actionResponses);
  });

  afterEach(() => {
    endpointAppContextService.stop();
  });

  it('should return expected output `data` length for selected statuses', async () => {
    actionRequests = createActionRequestsEsSearchResultsMock(undefined, true);
    actionResponses = createActionResponsesEsSearchResultsMock();

    applyActionListEsSearchMock(esClient, actionRequests, actionResponses);
    // mock metadataService.findHostMetadataForFleetAgents resolved value
    (endpointAppContextService.getEndpointMetadataService as jest.Mock) = jest
      .fn()
      .mockReturnValue({
        findHostMetadataForFleetAgents: jest.fn().mockResolvedValue([]),
      });

    const getActionListByStatusPromise = ({ page }: { page: number }) =>
      getActionListByStatus({
        esClient,
        logger,
        metadataService: endpointAppContextService.getEndpointMetadataService(),
        page: page ?? 1,
        pageSize: 10,
        statuses: ['failed', 'pending', 'successful'],
      });

    expect(await (await getActionListByStatusPromise({ page: 1 })).data.length).toEqual(10);

    expect(await (await getActionListByStatusPromise({ page: 2 })).data.length).toEqual(10);

    expect(await (await getActionListByStatusPromise({ page: 3 })).data.length).toEqual(3);
  });
});
