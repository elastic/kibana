/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer, SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { VulnerableResourceStat } from '../../../common/types';
import { LATEST_VULNERABILITIES_INDEX_DEFAULT_NS } from '../../../common/constants';

interface ResourceBucket {
  key: string | undefined;
  doc_count?: number;
  top_region: {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    buckets: Array<{
      key?: string;
      doc_count?: string;
    }>;
  };
}

export interface VulnerableResourcesQueryResult {
  vulnerable_resources: {
    buckets: ResourceBucket[];
  };
}

const getVulnerabilitiesResourcesQuery = (query: QueryDslQueryContainer): SearchRequest => ({
  size: 0,
  query,
  index: LATEST_VULNERABILITIES_INDEX_DEFAULT_NS,
  aggs: {
    vulnerable_resources: {
      terms: {
        field: 'resource.name',
        order: {
          _count: 'desc',
        },
        size: 10,
      },
      aggs: {
        top_region: {
          terms: {
            field: 'cloud.region',
            size: 1,
          },
        },
      },
    },
  },
});

export const getTopVulnerableResources = async (
  esClient: ElasticsearchClient,
  query: QueryDslQueryContainer
): Promise<VulnerableResourceStat[]> => {
  const queryResult = await esClient.search<unknown, VulnerableResourcesQueryResult>(
    getVulnerabilitiesResourcesQuery(query)
  );
  if (!queryResult?.aggregations?.vulnerable_resources) return [];

  return queryResult.aggregations.vulnerable_resources.buckets.map((resource: ResourceBucket) => ({
    resourceName: resource.key,
    resourceCount: resource.doc_count,
    cloudRegion: resource.top_region?.buckets?.[0]?.key ?? '',
  }));
};
