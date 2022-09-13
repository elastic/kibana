/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { LATEST_FINDINGS_INDEX_TEMPLATE_NAME } from '../../common/constants';

export interface FindingsUsage extends FindingsStats {
  benchmark: string;
  k8s_object: FindingsStats;
  process: FindingsStats;
  file: FindingsStats;
  load_balancer: FindingsStats;
}

export interface FindingsStats {
  total: number;
  passed: number;
  failed: number;
}

export const getFindingsUsage = async (esClient: ElasticsearchClient) => {
  // const [findingsIndexCount, latestFindingsIndexCount, scoresIndexCount] = await Promise.all([
  //   getDocsCount(esClient, FINDINGS_INDEX_PATTERN),
  //   getDocsCount(esClient, LATEST_FINDINGS_INDEX_PATTERN),
  //   getDocsCount(esClient, BENCHMARK_SCORE_INDEX_PATTERN),
  // ]);
  const foo = await getDocsCount(esClient, LATEST_FINDINGS_INDEX_TEMPLATE_NAME);
  console.log(foo.aggregations.resource_type);
  console.log(foo.aggregations.resource_type.buckets.file);

  return {
    total: 5,
    passed: 4,
    failed: 4,
    cluster_id: 'foo',
    benchmark: 'boo',
  };
};

// const getDocsCount = async (esClient: ElasticsearchClient, index: string) => {
const getDocsCount = async (esClient: ElasticsearchClient) => {
  const response = await esClient.search({
    index: 'logs-cloud_security_posture.findings_latest-default',
    body: {
      aggs: {
        resource_type: {
          filters: {
            filters: {
              file: {
                bool: {
                  filter: [
                    {
                      bool: {
                        should: [
                          {
                            match_phrase: {
                              'resource.type': 'file',
                            },
                          },
                        ],
                        minimum_should_match: 1,
                      },
                    },
                  ],
                },
              },
              k8s_object: {
                bool: {
                  filter: [
                    {
                      bool: {
                        should: [
                          {
                            match_phrase: {
                              'resource.type': 'k8s_object',
                            },
                          },
                        ],
                        minimum_should_match: 1,
                      },
                    },
                  ],
                },
              },
              process: {
                bool: {
                  filter: [
                    {
                      bool: {
                        should: [
                          {
                            match_phrase: {
                              'resource.type': 'process',
                            },
                          },
                        ],
                        minimum_should_match: 1,
                      },
                    },
                  ],
                },
              },
            },
          },
          aggs: {
            evaluation: {
              filters: {
                filters: {
                  failed: {
                    bool: {
                      filter: [
                        {
                          bool: {
                            should: [
                              {
                                match_phrase: {
                                  'result.evaluation': 'failed',
                                },
                              },
                            ],
                            minimum_should_match: 1,
                          },
                        },
                      ],
                    },
                  },
                  passed: {
                    bool: {
                      filter: [
                        {
                          bool: {
                            should: [
                              {
                                match_phrase: {
                                  'result.evaluation': 'passed',
                                },
                              },
                            ],
                            minimum_should_match: 1,
                          },
                        },
                      ],
                    },
                  },
                  all: {
                    bool: {
                      must: [],
                    },
                  },
                },
              },
            },
          },
        },
      },
      size: 0,
      query: {
        match_all: {},
      },
    },
    // ignore_unavailable: true,
  });
  return response;
};
