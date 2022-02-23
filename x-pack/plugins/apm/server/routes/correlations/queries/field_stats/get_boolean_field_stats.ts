/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { FieldValuePair } from '../../../../../common/correlations/types';
import {
  FieldStatsCommonRequestParams,
  BooleanFieldStats,
  Aggs,
  TopValueBucket,
} from '../../../../../common/correlations/field_stats_types';
import { getQueryWithParams } from '../get_query_with_params';

export const getBooleanFieldStatsRequest = (
  params: FieldStatsCommonRequestParams,
  fieldName: string,
  termFilters?: FieldValuePair[]
): estypes.SearchRequest => {
  const query = getQueryWithParams({ params, termFilters });

  const { index } = params;

  const size = 0;
  const aggs: Aggs = {
    sampled_value_count: {
      filter: { exists: { field: fieldName } },
    },
    sampled_values: {
      terms: {
        field: fieldName,
        size: 2,
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

interface SamplesValuesAggs
  extends estypes.AggregationsTermsAggregateBase<TopValueBucket> {
  buckets: TopValueBucket[];
}

interface FieldStatsAggs {
  sampled_value_count: estypes.AggregationsSingleBucketAggregateBase;
  sampled_values: SamplesValuesAggs;
}

export const fetchBooleanFieldStats = async (
  esClient: ElasticsearchClient,
  params: FieldStatsCommonRequestParams,
  field: FieldValuePair,
  termFilters?: FieldValuePair[]
): Promise<BooleanFieldStats> => {
  const request = getBooleanFieldStatsRequest(
    params,
    field.fieldName,
    termFilters
  );
  const body = await esClient.search<unknown, FieldStatsAggs>(request);
  const aggregations = body.aggregations;
  const stats: BooleanFieldStats = {
    fieldName: field.fieldName,
    count: aggregations?.sampled_value_count.doc_count ?? 0,
  };

  const valueBuckets = aggregations?.sampled_values?.buckets ?? [];
  valueBuckets.forEach((bucket) => {
    stats[`${bucket.key.toString()}Count`] = bucket.doc_count;
  });
  return stats;
};
