/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  EndpointActionResponse,
  LogsEndpointAction,
  LogsEndpointActionResponse,
} from '../../../../common/endpoint/types';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';
import { getActionList } from './action_list';
import { CustomHttpRequestError } from '../../../utils/custom_http_request_error';
import {
  applyActionListEsSearchMock,
  createActionRequestsEsSearchResultsMock,
  createActionResponsesEsSearchResultsMock,
} from './mocks';
import { MockedLogger } from '@kbn/logging-mocks';

describe('When using `getActionList()', () => {
  let esClient: ElasticsearchClientMock;
  let logger: MockedLogger;
  let endpointActionGenerator: EndpointActionGenerator;
  let actionRequests: estypes.SearchResponse<LogsEndpointAction>;
  let actionResponses: estypes.SearchResponse<EndpointActionResponse | LogsEndpointActionResponse>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createScopedClusterClient().asInternalUser;
    logger = loggingSystemMock.createLogger();
    endpointActionGenerator = new EndpointActionGenerator('seed');

    actionRequests = createActionRequestsEsSearchResultsMock();
    actionResponses = createActionResponsesEsSearchResultsMock();

    applyActionListEsSearchMock(esClient, actionRequests, actionResponses);
  });

  it('should return expected output', async () => {
    const doc = actionRequests.hits.hits[0]._source;
    await expect(getActionList({ esClient, logger, page: 1, pageSize: 10 })).resolves.toEqual({
      page: 0,
      pageSize: 10,
      commands: undefined,
      userIds: undefined,
      startDate: undefined,
      elasticAgentIds: undefined,
      endDate: undefined,
      data: [
        {
          agents: ['agent-a'],
          command: 'unisolate',
          completedAt: '2022-04-30T16:08:47.449Z',
          wasSuccessful: true,
          errors: undefined,
          id: '123',
          isCompleted: true,
          isExpired: false,
          startedAt: '2022-04-27T16:08:47.449Z',
          comment: doc?.EndpointActions.data.comment,
          createdBy: doc?.user.id,
          parameters: doc?.EndpointActions.data.parameters,
        },
      ],
      total: 1,
    });
  });

  it('should call query with expected filters when querying for Action Request', async () => {
    await getActionList({
      esClient,
      logger,
      elasticAgentIds: ['123'],
      pageSize: 20,
      startDate: 'now-10d',
      endDate: 'now',
      commands: ['isolate', 'unisolate', 'get-file'],
      userIds: ['elastic'],
    });

    expect(esClient.search).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        body: {
          query: {
            bool: {
              filter: [
                {
                  term: {
                    input_type: 'endpoint',
                  },
                },
                {
                  term: {
                    type: 'INPUT_ACTION',
                  },
                },
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
                    user_id: ['elastic'],
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
          sort: [
            {
              '@timestamp': {
                order: 'desc',
              },
            },
          ],
        },
        from: 0,
        index: '.logs-endpoint.actions-default',
        size: 20,
      }),
      expect.objectContaining({
        ignore: [404],
        meta: true,
      })
    );
  });

  it('should return an empty array if no actions are found', async () => {
    actionRequests.hits.hits = [];
    (actionResponses.hits.total as estypes.SearchTotalHits).value = 0;
    actionRequests = endpointActionGenerator.toEsSearchResponse([]);

    await expect(getActionList({ esClient, logger })).resolves.toEqual(
      expect.objectContaining({
        commands: undefined,
        data: [],
        elasticAgentIds: undefined,
        endDate: undefined,
        page: 0,
        pageSize: undefined,
        startDate: undefined,
        total: 0,
        userIds: undefined,
      })
    );
  });

  it('should have `isExpired` as `true` if NOT complete and expiration is in the past', async () => {
    (
      actionRequests.hits.hits[0]._source as LogsEndpointAction
    ).EndpointActions.expiration = `2021-04-30T16:08:47.449Z`;
    actionResponses.hits.hits.pop(); // remove the endpoint response

    await expect(
      await (
        await getActionList({ esClient, logger, elasticAgentIds: ['123'] })
      ).data[0]
    ).toEqual(
      expect.objectContaining({
        isExpired: true,
        isCompleted: false,
      })
    );
  });

  it('should have `isExpired` as `false` if complete and expiration is in the past', async () => {
    (
      actionRequests.hits.hits[0]._source as LogsEndpointAction
    ).EndpointActions.expiration = `2021-04-30T16:08:47.449Z`;

    await expect(
      await (
        await getActionList({ esClient, logger, elasticAgentIds: ['123'] })
      ).data[0]
    ).toEqual(
      expect.objectContaining({
        isExpired: false,
        isCompleted: true,
      })
    );
  });

  it('should throw custom errors', async () => {
    const error = new Error('Some odd error!');

    esClient.search.mockImplementation(async () => {
      return Promise.reject(error);
    });
    const getActionListPromise = getActionList({ esClient, logger });

    await expect(getActionListPromise).rejects.toThrowError(
      'Unknown error while fetching action requests'
    );
    await expect(getActionListPromise).rejects.toBeInstanceOf(CustomHttpRequestError);
  });
});
