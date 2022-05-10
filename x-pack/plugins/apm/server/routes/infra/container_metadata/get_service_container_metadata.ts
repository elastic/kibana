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

  if (index) {
    const should = [
      { exists: { field: CONTAINER_ID } },
      { exists: { field: KUBERNETES } },
    ];
    const filter = [
      { term: { [CONTAINER_ID]: containerId } },
      ...rangeQuery(start, end),
    ];

    const response = await esClient.search<ESResponse>({
      index: [index],
      _source: [KUBERNETES],
      query: { bool: { filter, should } },
      // query: {
      //   bool: {
      //     filter: [
      //       {
      //         bool: {
      //           should: [
      //             {
      //               match_phrase: {
      //                 [CONTAINER_ID]: containerId,
      //               },
      //             },
      //           ],
      //           minimum_should_match: 1,
      //         },
      //       },
      //       ...rangeQuery(start, end),
      //     ],
      //   },
      // },
    });

    return { response };
  }
};
