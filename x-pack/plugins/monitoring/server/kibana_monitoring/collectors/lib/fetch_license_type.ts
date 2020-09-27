/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { LegacyAPICaller } from 'src/core/server';
import { INDEX_PATTERN_ELASTICSEARCH } from '../../../../common/constants';
import { getCcsIndexPattern } from '../../../lib/alerts/get_ccs_index_pattern';

export async function fetchLicenseType(
  callCluster: LegacyAPICaller,
  availableCcs: string[],
  clusterUuid: string
) {
  let index = INDEX_PATTERN_ELASTICSEARCH;
  if (availableCcs) {
    index = getCcsIndexPattern(index, availableCcs);
  }
  const params = {
    index,
    filterPath: ['hits.hits._source.license'],
    body: {
      size: 1,
      sort: [
        {
          timestamp: {
            order: 'desc',
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
  const response = await callCluster('search', params);
  return get(response, 'hits.hits[0]._source.license.type', null);
}
