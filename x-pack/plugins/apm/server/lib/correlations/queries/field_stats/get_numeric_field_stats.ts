/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import { find, get } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  NumericFieldStats,
  FieldStatsCommonRequestParams,
  TopValueBucket,
  Aggs,
} from '../../../../../common/correlations/field_stats_types';
import { FieldValuePair } from '../../../../../common/correlations/types';
import { getQueryWithParams } from '../get_query_with_params';
import { buildSamplerAggregation } from '../../utils/field_stats_utils';

// Only need 50th percentile for the median
const PERCENTILES = [50];

export const getNumericFieldStatsRequest = (
  params: FieldStatsCommonRequestParams,
  fieldName: string,
  termFilters?: FieldValuePair[]
) => {
  const query = getQueryWithParams({ params, termFilters });
  const size = 0;

  const { index, samplerShardSize } = params;

  const percents = PERCENTILES;
  const aggs: Aggs = {
    sampled_field_stats: {
      filter: { exists: { field: fieldName } },
      aggs: {
        actual_stats: {
          stats: { field: fieldName },
        },
      },
    },
    sampled_percentiles: {
      percentiles: {
        field: fieldName,
        percents,
        keyed: false,
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
    aggs: {
      sample: buildSamplerAggregation(aggs, samplerShardSize),
    },
  };

  return {
    index,
    size,
    body: searchBody,
  };
};

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
  const { body } = await esClient.search(request);

  const aggregations = body.aggregations as {
    sample: {
      sampled_top: estypes.AggregationsTermsAggregate<TopValueBucket>;
      sampled_percentiles: estypes.AggregationsHdrPercentilesAggregate;
      sampled_field_stats: {
        doc_count: number;
        actual_stats: estypes.AggregationsStatsAggregate;
      };
    };
  };
  const docCount = aggregations?.sample.sampled_field_stats?.doc_count ?? 0;
  const fieldStatsResp =
    aggregations?.sample.sampled_field_stats?.actual_stats ?? {};
  const topValues = aggregations?.sample.sampled_top?.buckets ?? [];

  const stats: NumericFieldStats = {
    fieldName: field.fieldName,
    count: docCount,
    min: get(fieldStatsResp, 'min', 0),
    max: get(fieldStatsResp, 'max', 0),
    avg: get(fieldStatsResp, 'avg', 0),
    topValues,
    topValuesSampleSize: topValues.reduce(
      (acc: number, curr: TopValueBucket) => acc + curr.doc_count,
      aggregations.sample.sampled_top?.sum_other_doc_count ?? 0
    ),
  };

  if (stats.count !== undefined && stats.count > 0) {
    const percentiles = aggregations?.sample.sampled_percentiles.values ?? [];
    const medianPercentile: { value: number; key: number } | undefined = find(
      percentiles,
      {
        key: 50,
      }
    );
    stats.median = medianPercentile !== undefined ? medianPercentile!.value : 0;
  }

  return stats;
};
