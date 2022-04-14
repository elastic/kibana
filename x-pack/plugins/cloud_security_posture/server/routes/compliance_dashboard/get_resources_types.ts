/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import type {
  AggregationsMultiBucketAggregateBase as Aggregation,
  QueryDslQueryContainer,
  SearchRequest,
} from '@elastic/elasticsearch/lib/api/types';
import type { ComplianceDashboardData } from '../../../common/types';
import { KeyDocCount } from './compliance_dashboard';
import { LATEST_FINDINGS_INDEX_PATTERN } from '../../../common/constants';

export interface ResourceTypeQueryResult {
  aggs_by_resource_type: Aggregation<ResourceTypeBucket>;
}

export interface ResourceTypeBucket extends KeyDocCount {
  failed_findings: {
    doc_count: number;
  };
  passed_findings: {
    doc_count: number;
  };
}

export const resourceTypeAggQuery = {
  aggs_by_resource_type: {
    terms: {
      field: 'type.keyword',
    },
    aggs: {
      failed_findings: {
        filter: { term: { 'result.evaluation.keyword': 'failed' } },
      },
      passed_findings: {
        filter: { term: { 'result.evaluation.keyword': 'passed' } },
      },
    },
  },
};

export const getRisksEsQuery = (query: QueryDslQueryContainer): SearchRequest => ({
  index: LATEST_FINDINGS_INDEX_PATTERN,
  size: 0,
  query,
  aggs: resourceTypeAggQuery,
});

export const getResourceTypeFromAggs = (
  queryResult: ResourceTypeBucket[]
): ComplianceDashboardData['resourcesTypes'] =>
  queryResult.map((bucket) => ({
    name: bucket.key,
    totalFindings: bucket.doc_count,
    totalFailed: bucket.failed_findings.doc_count || 0,
    totalPassed: bucket.passed_findings.doc_count || 0,
  }));

export const getResourcesTypes = async (
  esClient: ElasticsearchClient,
  query: QueryDslQueryContainer
): Promise<ComplianceDashboardData['resourcesTypes']> => {
  const resourceTypesQueryResult = await esClient.search<unknown, ResourceTypeQueryResult>(
    getRisksEsQuery(query),
    { meta: true }
  );

  const resourceTypes = resourceTypesQueryResult.body.aggregations?.aggs_by_resource_type.buckets;
  if (!Array.isArray(resourceTypes)) throw new Error('missing resources types buckets');

  return getResourceTypeFromAggs(resourceTypes);
};
