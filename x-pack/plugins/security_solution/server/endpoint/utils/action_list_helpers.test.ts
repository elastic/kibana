/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedClusterClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import {
  applyActionListEsSearchMock,
  createActionRequestsEsSearchResultsMock,
} from '../services/actions/mocks';
import { getActions } from './action_list_helpers';

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
                      filter: [],
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
        agentTypes: ['endpoint'],
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

    describe('action `Types` filter', () => {
      it('should correctly query with multiple action `types` filter options provided', async () => {
        const esClient = mockScopedEsClient.asInternalUser;

        applyActionListEsSearchMock(esClient);
        await getActions({
          esClient,
          size: 20,
          from: 5,
          startDate: 'now-10d',
          elasticAgentIds: ['agent-123', 'agent-456'],
          endDate: 'now',
          types: ['manual', 'automated'],
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

      it('should correctly query with single `manual` action `types` filter options provided', async () => {
        const esClient = mockScopedEsClient.asInternalUser;

        applyActionListEsSearchMock(esClient);
        await getActions({
          esClient,
          size: 20,
          from: 5,
          startDate: 'now-10d',
          elasticAgentIds: ['agent-123', 'agent-456'],
          endDate: 'now',
          types: ['manual'],
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
                  must_not: {
                    exists: {
                      field: 'data.alert_id',
                    },
                  },
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

      it('should correctly query with single `automated` action `types` filter options provided', async () => {
        const esClient = mockScopedEsClient.asInternalUser;

        applyActionListEsSearchMock(esClient);
        await getActions({
          esClient,
          size: 20,
          from: 5,
          startDate: 'now-10d',
          elasticAgentIds: ['agent-123', 'agent-456'],
          endDate: 'now',
          types: ['automated'],
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
                  filter: {
                    exists: {
                      field: 'data.alert_id',
                    },
                  },
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
    });
  });
});
