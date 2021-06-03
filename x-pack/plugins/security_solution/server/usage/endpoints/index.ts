/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '../../../../../../src/core/server';

// The Elasticsearch index.max_result_window default value
const MAX_RESULT_WINDOW = 10_000;

// Collapsable query to get latest emitted metric doc from endpoint agents
const ENDPOINT_METRICS_QUERY = {
  index: `.ds-metrics-endpoint.metrics*`,
  expand_wildcards: 'open,hidden',
  size: MAX_RESULT_WINDOW,
  collapse: {
    field: 'agent.id',
    inner_hits: {
      name: 'most_recent',
      size: 1,
      sort: [{ '@timestamp': 'desc' }],
    },
  },
  query: {
    bool: {
      filter: [
        {
          range: {
            '@timestamp': {
              gte: 'now-24h',
              lte: 'now',
            },
          },
        },
      ],
    },
  },
};

/**
 * @description Fetches and summarizes endpoints transmitted metrics
 * @param esClient
 */
export const fetchEndpointMetrics = async (esClient: ElasticsearchClient) => {
  const results = await esClient.search(ENDPOINT_METRICS_QUERY);

  // TODO:@pjhampton - wrangle and parse the es results
  return {};
};
