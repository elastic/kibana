/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, SearchResponse } from '@kbn/core/server';
import { rangeQuery } from '@kbn/observability-plugin/server';
import {
  CONTAINER_ID,
  KUBERNETES,
  KUBERNETES_NODE,
  NAMESPACE,
  PHASE,
} from '../../../../common/elasticsearch_fieldnames';

type ESResponse = SearchResponse;

export const getServiceContainerMetadata = async ({
  esClient,
  index,
  containerId,
  start,
  end,
}: {
  esClient: ElasticsearchClient;
  index?: string;
  containerId: string;
  start: number;
  end: number;
}) => {
  // includeFrozen ?

  const should = [
    { exists: { field: KUBERNETES } },
    { exists: { field: KUBERNETES_NODE } },
    { exists: { field: NAMESPACE } },
    { exists: { field: PHASE } },
  ];

  if (index) {
    const response = await esClient.search<ESResponse>({
      index: [index],
      _source: [KUBERNETES, CONTAINER_ID],
      query: {
        bool: {
          filter: [
            {
              term: { [CONTAINER_ID]: containerId },
            },
            ...rangeQuery(start, end),
          ],
          should,
        },
      },
    });

    const container = response.hits.hits[0]?._source;

    return { kubernetes: container.kubernetes };
  }
};
