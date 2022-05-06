/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

import { CONTAINER_ID } from '../../../../common/elasticsearch_fieldnames';
import { SearchResponse } from '@kbn/core/server';

type ESResponse = SearchResponse;

export const getServiceContainerMetadata = async ({
  esClient,
  containerId,
  index,
}: {
  esClient: ElasticsearchClient;
  containerId: string;
  index?: string;
}) => {
  if (index) {
    const response = await esClient.search<ESResponse>({
      index: [index],
      query: {
        bool: {
          filter: [
            {
              bool: {
                should: [
                  {
                    match_phrase: {
                      [CONTAINER_ID]: containerId,
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
    });

    return { response };
  }
};
