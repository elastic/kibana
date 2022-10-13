/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { ElasticsearchClient } from '@kbn/core/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { INDEX_PATTERN_ELASTICSEARCH } from '../../../../common/constants';
import { getCcsIndexPattern } from '../../../lib/alerts/get_ccs_index_pattern';

export async function fetchLicenseType(
  client: ElasticsearchClient,
  availableCcs: boolean,
  clusterUuid: string
) {
  let index = INDEX_PATTERN_ELASTICSEARCH;
  if (availableCcs) {
    index = getCcsIndexPattern(index, availableCcs);
  }
  const params: estypes.SearchRequest = {
    index,
    filter_path: ['hits.hits._source.license'],
    body: {
      size: 1,
      sort: [
        {
          timestamp: {
            order: 'desc',
            unmapped_type: 'long',
          },
        },
      ],
      query: {
        bool: {
          must: [
            {
              term: {
                cluster_uuid: {
                  value: clusterUuid,
                },
              },
            },
            {
              term: {
                type: {
                  value: 'cluster_stats',
                },
              },
            },
          ],
        },
      },
    },
  };
  const response = await client.search(params);
  return get(response, 'hits.hits[0]._source.license.type', null);
}
