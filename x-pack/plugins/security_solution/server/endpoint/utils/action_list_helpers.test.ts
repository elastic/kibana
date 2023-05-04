/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ScopedClusterClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import {
  applyActionListEsSearchMock,
  createActionRequestsEsSearchResultsMock,
  createActionResponsesEsSearchResultsMock,
} from '../services/actions/mocks';
import { getActions, getActionResponses } from './action_list_helpers';

describe('action helpers', () => {
  let mockScopedEsClient: ScopedClusterClientMock;

  beforeEach(() => {
    mockScopedEsClient = elasticsearchServiceMock.createScopedClusterClient();
  });

  describe('#getActions', () => {
    it('should call with base filter query correctly when no other filter options provided', async () => {
      const esClient = mockScopedEsClient.asInternalUser;
      applyActionListEsSearchMock(esClient);
      await getActions({ esClient, size: 10, from: 0 });

      expect(esClient.search).toHaveBeenCalledWith(
        {
          body: {
            query: {
              bool: {
                must: [
                  {
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
                      ],
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
          size: 10,
        },
        {
          ignore: [404],
          meta: true,
        }
      );
    });

    it('should query with additional filter options provided', async () => {
      const esClient = mockScopedEsClient.asInternalUser;

      applyActionListEsSearchMock(esClient);
      await getActions({
        esClient,
        size: 20,
        from: 5,
        startDate: 'now-10d',
        elasticAgentIds: ['agent-123', 'agent-456'],
        endDate: 'now',
        commands: ['isolate', 'unisolate', 'get-file'],
        userIds: ['*elastic*', '*kibana*'],
      });

      expect(esClient.search).toHaveBeenCalledWith(
        {
          body: {
            query: {
              bool: {
                must: [
                  {
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
                            agents: ['agent-123', 'agent-456'],
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
                                query_string: {
                                  fields: ['user_id'],
                                  query: '*elastic*',
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
                                query_string: {
                                  fields: ['user_id'],
                                  query: '*kibana*',
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
          },
          from: 5,
          index: '.logs-endpoint.actions-default',
          size: 20,
        },
        {
          ignore: [404],
          meta: true,
        }
      );
    });

    it('should search with exact usernames when given', async () => {
      const esClient = mockScopedEsClient.asInternalUser;

      applyActionListEsSearchMock(esClient);
      await getActions({
        esClient,
        size: 10,
        from: 1,
        startDate: 'now-1d',
        endDate: 'now',
        userIds: ['elastic', 'kibana'],
      });

      expect(esClient.search).toHaveBeenCalledWith(
        {
          body: {
            query: {
              bool: {
                must: [
                  {
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
          },
          from: 1,
          index: '.logs-endpoint.actions-default',
          size: 10,
        },
        {
          ignore: [404],
          meta: true,
        }
      );
    });

    it('should return expected output', async () => {
      const esClient = mockScopedEsClient.asInternalUser;
      const actionRequests = createActionRequestsEsSearchResultsMock();

      applyActionListEsSearchMock(esClient, actionRequests);

      const actions = await getActions({
        esClient,
        size: 10,
        from: 0,
        elasticAgentIds: ['agent-a'],
      });

      expect(actions.actionIds).toEqual(['123']);
      expect(actions.actionRequests?.body?.hits?.hits[0]._source?.agent.id).toEqual('agent-a');
    });
  });

  describe('#getActionResponses', () => {
    it('should use base filters correctly when no other filter options provided', async () => {
      const esClient = mockScopedEsClient.asInternalUser;
      applyActionListEsSearchMock(esClient);
      await getActionResponses({ esClient, actionIds: [] });

      expect(esClient.search).toHaveBeenCalledWith(
        {
          body: {
            query: {
              bool: {
                filter: [],
              },
            },
          },
          from: 0,
          index: ['.fleet-actions-results', '.logs-endpoint.action.responses-*'],
          size: 10000,
        },
        {
          headers: {
            'X-elastic-product-origin': 'fleet',
          },
          ignore: [404],
          meta: true,
        }
      );
    });
    it('should query with actionIds and elasticAgentIds when provided', async () => {
      const actionIds = [uuidv4(), uuidv4()];
      const elasticAgentIds = ['123', '456'];
      const esClient = mockScopedEsClient.asInternalUser;
      applyActionListEsSearchMock(esClient);
      await getActionResponses({ esClient, actionIds, elasticAgentIds });

      expect(esClient.search).toHaveBeenCalledWith(
        {
          body: {
            query: {
              bool: {
                filter: [
                  {
                    terms: {
                      agent_id: elasticAgentIds,
                    },
                  },
                  {
                    terms: {
                      action_id: actionIds,
                    },
                  },
                ],
              },
            },
          },
          from: 0,
          index: ['.fleet-actions-results', '.logs-endpoint.action.responses-*'],
          size: 10000,
        },
        {
          headers: {
            'X-elastic-product-origin': 'fleet',
          },
          ignore: [404],
          meta: true,
        }
      );
    });
    it('should return expected output', async () => {
      const esClient = mockScopedEsClient.asInternalUser;
      const actionRes = createActionResponsesEsSearchResultsMock();
      applyActionListEsSearchMock(esClient, undefined, actionRes);

      const responses = await getActionResponses({
        esClient,
        actionIds: ['123'],
        elasticAgentIds: ['agent-a'],
      });

      const responseHits = responses.body.hits.hits;

      expect(responseHits.length).toEqual(2);
      expect(
        responseHits.map((e) => e._index).filter((e) => e.includes('.fleet-actions-results')).length
      ).toEqual(1);
      expect(
        responseHits
          .map((e) => e._index)
          .filter((e) => e.includes('.logs-endpoint.action.responses')).length
      ).toEqual(1);
    });
  });
});
