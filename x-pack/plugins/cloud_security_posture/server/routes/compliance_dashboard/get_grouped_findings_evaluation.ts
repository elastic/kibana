/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import type {
  AggregationsMultiBucketAggregateBase as Aggregation,
  QueryDslQueryContainer,
  SearchRequest,
} from '@elastic/elasticsearch/lib/api/types';
import { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import { LATEST_FINDINGS_RETENTION_POLICY } from '../../../common/constants';
import { calculatePostureScore } from '../../../common/utils/helpers';
import type { ComplianceDashboardData } from '../../../common/types';
import { KeyDocCount } from './compliance_dashboard';

export interface FailedFindingsQueryResult {
  aggs_by_resource_type: Aggregation<FailedFindingsBucket>;
}

export interface FailedFindingsBucket extends KeyDocCount {
  failed_findings: {
    doc_count: number;
  };
  passed_findings: {
    doc_count: number;
  };
  score: { value: number };
}

export const failedFindingsAggQuery = {
  aggs_by_resource_type: {
    terms: {
      field: 'rule.section',
      size: 60000,
    },
    aggs: {
      unique_event_code: {
        terms: {
          field: 'event.code',
          size: 65000,
        },
        aggs: {
          latest_result_evaluation: {
            top_hits: {
              _source: ['result.evaluation'],
              size: 1,
              sort: [{ '@timestamp': 'desc' }],
            },
          },
        },
      },
    },
  },
};

export const getRisksEsQuery = (
  query: QueryDslQueryContainer,
  pitId: string,
  runtimeMappings: MappingRuntimeFields
): SearchRequest => ({
  size: 0,
  // creates the `safe_posture_type` runtime fields,
  // `safe_posture_type` is used by the `query` to filter by posture type for older findings without this field
  runtime_mappings: runtimeMappings,
  query: {
    ...query,
    bool: {
      ...query?.bool,
      filter: [
        ...(query?.bool?.filter || []),
        {
          range: {
            '@timestamp': {
              gte: `now-${LATEST_FINDINGS_RETENTION_POLICY}`,
            },
          },
        },
      ],
    },
  },
  aggs: failedFindingsAggQuery,
  pit: {
    id: pitId,
  },
});

export const getFailedFindingsFromAggs = (
  queryResult: FailedFindingsBucket[]
): ComplianceDashboardData['groupedFindingsEvaluation'] =>
  queryResult.map((bucket) => {
    let totalPassed = 0;
    let totalFailed = 0;
    const findingsBucketsLength = bucket.unique_event_code.buckets.length;

    for (let i = 0; i < findingsBucketsLength; i++) {
      const evaluationBucket = bucket.unique_event_code.buckets[i];
      const latestResultEvaluation =
        evaluationBucket.latest_result_evaluation.hits.hits[0]._source.result.evaluation;
      totalPassed += latestResultEvaluation === 'passed' ? 1 : 0;
      totalFailed += latestResultEvaluation === 'failed' ? 1 : 0;
    }

    return {
      name: bucket.key,
      totalFindings: totalFailed + totalPassed,
      totalFailed,
      totalPassed,
      postureScore: calculatePostureScore(totalPassed, totalFailed),
    };
  });

export const getGroupedFindingsEvaluation = async (
  esClient: ElasticsearchClient,
  query: QueryDslQueryContainer,
  pitId: string,
  runtimeMappings: MappingRuntimeFields
): Promise<ComplianceDashboardData['groupedFindingsEvaluation']> => {
  const resourceTypesQueryResult = await esClient.search<unknown, FailedFindingsQueryResult>(
    getRisksEsQuery(query, pitId, runtimeMappings)
  );

  const ruleSections = resourceTypesQueryResult.aggregations?.aggs_by_resource_type.buckets;
  if (!Array.isArray(ruleSections)) {
    return [];
  }

  return getFailedFindingsFromAggs(ruleSections);
};
