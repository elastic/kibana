/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  NumericFieldStats,
  FieldStatsCommonRequestParams,
  TopValueBucket,
  Aggs,
} from '../../../../../common/correlations/field_stats_types';
import { FieldValuePair } from '../../../../../common/correlations/types';
import { getQueryWithParams } from '../get_query_with_params';

export const getNumericFieldStatsRequest = (
  params: FieldStatsCommonRequestParams,
  fieldName: string,
  termFilters?: FieldValuePair[]
) => {
  const query = getQueryWithParams({ params, termFilters });
  const size = 0;

  const { index } = params;

  const aggs: Aggs = {
    sampled_field_stats: {
      filter: { exists: { field: fieldName } },
      aggs: {
        actual_stats: {
          stats: { field: fieldName },
        },
      },
    },
    sampled_top: {
      terms: {
        field: fieldName,
        size: 10,
        order: {
          _count: 'desc',
        },
      },
    },
  };

  const searchBody = {
    query,
    aggs,
  };

  return {
    index,
    size,
    track_total_hits: false,
    body: searchBody,
  };
};

interface SampledTopAggs
  extends estypes.AggregationsTermsAggregateBase<TopValueBucket> {
  buckets: TopValueBucket[];
}
interface StatsAggs {
  sampled_top: SampledTopAggs;
  sampled_field_stats: {
    doc_count: number;
    actual_stats: estypes.AggregationsStatsAggregate;
  };
}

export const fetchNumericFieldStats = async (
  esClient: ElasticsearchClient,
  params: FieldStatsCommonRequestParams,
  field: FieldValuePair,
  termFilters?: FieldValuePair[]
): Promise<NumericFieldStats> => {
  const request: estypes.SearchRequest = getNumericFieldStatsRequest(
    params,
    field.fieldName,
    termFilters
  );
  const body = await esClient.search<unknown, StatsAggs>(request);

  const aggregations = body.aggregations;
  const docCount = aggregations?.sampled_field_stats?.doc_count ?? 0;
  const fieldStatsResp: Partial<estypes.AggregationsStatsAggregate> =
    aggregations?.sampled_field_stats?.actual_stats ?? {};
  const topValues = aggregations?.sampled_top?.buckets ?? [];

  const stats: NumericFieldStats = {
    fieldName: field.fieldName,
    count: docCount,
    min: fieldStatsResp?.min || 0,
    max: fieldStatsResp?.max || 0,
    avg: fieldStatsResp?.avg || 0,
    topValues,
    topValuesSampleSize: topValues.reduce(
      (acc: number, curr: TopValueBucket) => acc + curr.doc_count,
      aggregations?.sampled_top?.sum_other_doc_count ?? 0
    ),
  };

  return stats;
};
