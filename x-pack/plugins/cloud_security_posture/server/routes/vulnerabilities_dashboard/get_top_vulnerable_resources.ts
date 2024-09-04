/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { AggFieldBucket, VulnerableResourceStat } from '../../../common/types_old';
import { CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN } from '../../../common/constants';

interface ResourceBucket {
  key: string | undefined;
  doc_count?: number;
  resource_name: AggFieldBucket;
  top_region: AggFieldBucket;
}

export interface VulnerableResourcesQueryResult {
  vulnerable_resources: {
    buckets: ResourceBucket[];
  };
}

const getVulnerabilitiesResourcesQuery = (): SearchRequest => ({
  size: 0,
  query: {
    match_all: {},
  },
  index: CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN,
  aggs: {
    vulnerable_resources: {
      terms: {
        field: 'resource.id',
        order: {
          _count: 'desc',
        },
        size: 10,
      },
      aggs: {
        resource_name: {
          terms: {
            field: 'resource.name',
            size: 1,
          },
        },
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
  esClient: ElasticsearchClient
): Promise<VulnerableResourceStat[]> => {
  const queryResult = await esClient.search<unknown, VulnerableResourcesQueryResult>(
    getVulnerabilitiesResourcesQuery()
  );
  if (!queryResult?.aggregations?.vulnerable_resources) return [];

  return queryResult.aggregations.vulnerable_resources.buckets.map((resource: ResourceBucket) => ({
    resource: {
      id: resource.key,
      name: resource.resource_name?.buckets?.[0]?.key ?? '',
    },
    vulnerabilityCount: resource.doc_count,
    cloudRegion: resource.top_region?.buckets?.[0]?.key ?? '',
  }));
};
