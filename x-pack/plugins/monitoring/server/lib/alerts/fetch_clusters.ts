/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { get } from 'lodash';
import { AlertCluster } from '../../../common/types/alerts';
import { getNewIndexPatterns } from '../cluster/get_index_patterns';
import { createDatasetFilter } from './create_dataset_query_filter';
import { Globals } from '../../static_globals';
import { getConfigCcs } from '../../../common/ccs_utils';

interface RangeFilter {
  [field: string]: {
    format?: string;
    gte: string;
  };
}

export async function fetchClusters(
  esClient: ElasticsearchClient,
  rangeFilter: RangeFilter = { timestamp: { gte: 'now-2m' } }
): Promise<AlertCluster[]> {
  const indexPatterns = getNewIndexPatterns({
    config: Globals.app.config,
    moduleType: 'elasticsearch',
    dataset: 'cluster_stats',
    ccs: getConfigCcs(Globals.app.config) ? '*' : undefined,
  });
  const params = {
    index: indexPatterns,
    filter_path: [
      'hits.hits._source.cluster_settings.cluster.metadata.display_name',
      'hits.hits._source.cluster_uuid',
      'hits.hits._source.elasticsearch.cluster.id',
      'hits.hits._source.cluster_name',
      'hits.hits._source.elasticsearch.cluster.name',
    ],
    body: {
      size: 1000,
      query: {
        bool: {
          filter: [
            createDatasetFilter('cluster_stats', 'cluster_stats', 'elasticsearch.cluster_stats'),
            {
              range: rangeFilter,
            },
          ],
        },
      },
      collapse: {
        field: 'cluster_uuid',
      },
    },
  };

  const response = await esClient.search(params);

  return get(response, 'hits.hits', []).map((hit: any) => {
    const clusterName: string =
      get(hit, '_source.cluster_settings.cluster.metadata.display_name') ||
      get(hit, '_source.cluster_name') ||
      get(hit, '_source.elasticsearch.cluster.name') ||
      get(hit, '_source.cluster_uuid') ||
      get(hit, '_source.elasticsearch.cluster.id');
    return {
      clusterUuid: get(hit, '_source.cluster_uuid') || get(hit, '_source.elasticsearch.cluster.id'),
      clusterName,
    };
  });
}
