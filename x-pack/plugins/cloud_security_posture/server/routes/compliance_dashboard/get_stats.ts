/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import type { QueryDslQueryContainer, SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import { LATEST_FINDINGS_RETENTION_POLICY } from '../../../common/constants';
import { calculatePostureScore } from '../../../common/utils/helpers';
import type { ComplianceDashboardData } from '../../../common/types';

export interface FindingsEvaluationsQueryResult {
  failed_findings: {
    doc_count: number;
  };
  passed_findings: {
    doc_count: number;
  };
  resources_evaluated?: {
    value: number;
  };
}

export const findingsEvaluationAggsQuery = {
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
};

const uniqueResourcesCountQuery = {
  resources_evaluated: {
    cardinality: {
      field: 'resource.id',
    },
  },
};

export const getEvaluationsQuery = (
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
              gte: `now-${LATEST_FINDINGS_RETENTION_POLICY}/h`,
            },
          },
        },
      ],
    },
  },
  aggs: {
    ...findingsEvaluationAggsQuery,
    ...uniqueResourcesCountQuery,
  },
  pit: {
    id: pitId,
  },
});

export const getStatsFromFindingsEvaluationsAggs = (
  findingsEvaluationsAggs: FindingsEvaluationsQueryResult
): ComplianceDashboardData['stats'] => {
  const resourcesEvaluated = findingsEvaluationsAggs.resources_evaluated?.value;

  let passedFindings = 0;
  let failedFindings = 0;
  const findingsBucketsLength = findingsEvaluationsAggs.unique_event_code.buckets.length;

  for (let i = 0; i < findingsBucketsLength; i++) {
    const bucket = findingsEvaluationsAggs.unique_event_code.buckets[i];
    const latestResultEvaluation =
      bucket.latest_result_evaluation.hits.hits[0]._source.result.evaluation;
    passedFindings += latestResultEvaluation === 'passed' ? 1 : 0;
    failedFindings += latestResultEvaluation === 'failed' ? 1 : 0;
  }

  const totalFindings = failedFindings + passedFindings;
  const postureScore = calculatePostureScore(passedFindings, failedFindings) || 0;

  return {
    totalFailed: failedFindings,
    totalPassed: passedFindings,
    totalFindings,
    postureScore,
    ...(resourcesEvaluated && { resourcesEvaluated }),
  };
};

export const getStats = async (
  esClient: ElasticsearchClient,
  query: QueryDslQueryContainer,
  pitId: string,
  runtimeMappings: MappingRuntimeFields
): Promise<ComplianceDashboardData['stats']> => {
  const evaluationsQueryResult = await esClient.search<unknown, FindingsEvaluationsQueryResult>(
    getEvaluationsQuery(query, pitId, runtimeMappings)
  );

  const findingsEvaluations = evaluationsQueryResult.aggregations;
  if (!findingsEvaluations) throw new Error('missing findings evaluations');

  return getStatsFromFindingsEvaluationsAggs(findingsEvaluations);
};
