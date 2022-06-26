/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  EndpointActionResponse,
  LogsEndpointAction,
  LogsEndpointActionResponse,
} from '../../../../common/endpoint/types';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';
import { getActionDetailsById } from '..';
import { NotFoundError } from '../../errors';
import {
  applyActionsEsSearchMock,
  createActionRequestsEsSearchResultsMock,
  createActionResponsesEsSearchResultsMock,
} from './mocks';

describe('When using `getActionDetailsById()', () => {
  let esClient: ElasticsearchClientMock;
  let endpointActionGenerator: EndpointActionGenerator;
  let actionRequests: estypes.SearchResponse<LogsEndpointAction>;
  let actionResponses: estypes.SearchResponse<EndpointActionResponse | LogsEndpointActionResponse>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createScopedClusterClient().asInternalUser;
    endpointActionGenerator = new EndpointActionGenerator('seed');

    actionRequests = createActionRequestsEsSearchResultsMock();
    actionResponses = createActionResponsesEsSearchResultsMock();

    applyActionsEsSearchMock(esClient, actionRequests, actionResponses);
  });

  it('should return expected output', async () => {
    const doc = actionRequests.hits.hits[0]._source;
    await expect(getActionDetailsById(esClient, '123')).resolves.toEqual({
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
    });
  });

  it('should use expected filters when querying for Action Request', async () => {
    await getActionDetailsById(esClient, '123');

    expect(esClient.search).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        body: {
          query: {
            bool: {
              filter: [
                { term: { action_id: '123' } },
                { term: { input_type: 'endpoint' } },
                { term: { type: 'INPUT_ACTION' } },
              ],
            },
          },
        },
      }),
      expect.any(Object)
    );
  });

  it('should throw an error if action id does not exist', async () => {
    actionRequests.hits.hits = [];
    (actionResponses.hits.total as estypes.SearchTotalHits).value = 0;
    actionRequests = endpointActionGenerator.toEsSearchResponse([]);

    await expect(getActionDetailsById(esClient, '123')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should have `isExpired` of `true` if NOT complete and expiration is in the past', async () => {
    (
      actionRequests.hits.hits[0]._source as LogsEndpointAction
    ).EndpointActions.expiration = `2021-04-30T16:08:47.449Z`;
    actionResponses.hits.hits.pop(); // remove the endpoint response

    await expect(getActionDetailsById(esClient, '123')).resolves.toEqual(
      expect.objectContaining({
        isExpired: true,
        isCompleted: false,
      })
    );
  });

  it('should have `isExpired` of `false` if complete and expiration is in the past', async () => {
    (
      actionRequests.hits.hits[0]._source as LogsEndpointAction
    ).EndpointActions.expiration = `2021-04-30T16:08:47.449Z`;

    await expect(getActionDetailsById(esClient, '123')).resolves.toEqual(
      expect.objectContaining({
        isExpired: false,
        isCompleted: true,
      })
    );
  });
});
