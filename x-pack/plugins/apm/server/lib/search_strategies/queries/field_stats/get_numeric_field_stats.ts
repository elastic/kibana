/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import { SearchRequest } from '@elastic/elasticsearch/api/types';
import { find, get } from 'lodash';
import {
  NumericFieldStats,
  FieldStatsCommonRequestParams,
  TopValueBucket,
} from '../../../../../common/search_strategies/field_stats_types';
import { FieldValuePair } from '../../../../../common/search_strategies/types';
import { getQueryWithParams } from '../get_query_with_params';
import {
  buildSamplerAggregation,
  getSafeAggregationName,
  getSamplerAggregationsResponsePath,
} from '../../utils/field_stats_utils';
import { SAMPLER_TOP_TERMS_SHARD_SIZE } from '../../constants';
import { isPopulatedObject } from '../../../../../common/utils/object_utils';

// Only need 50th percentile for the median
const PERCENTILES = [50];

export const getNumericFieldStatsRequest = (
  params: FieldStatsCommonRequestParams,
  fieldName: string,
  safeFieldName: string
) => {
  const query = getQueryWithParams({ params });
  const size = 0;

  const { index, runtimeFieldMap, samplerShardSize } = params;

  const percents = PERCENTILES;
  const aggs: { [key: string]: any } = {};
  aggs[`${safeFieldName}_field_stats`] = {
    filter: { exists: { field: fieldName } },
    aggs: {
      actual_stats: {
        stats: { field: fieldName },
      },
    },
  };
  aggs[`${safeFieldName}_percentiles`] = {
    percentiles: {
      field: fieldName,
      percents,
      keyed: false,
    },
  };

  const top = {
    terms: {
      field: fieldName,
      size: 10,
      order: {
        _count: 'desc',
      },
    },
  };

  if (samplerShardSize < 1) {
    aggs[`${safeFieldName}_top`] = {
      sampler: {
        shard_size: SAMPLER_TOP_TERMS_SHARD_SIZE,
      },
      aggs: {
        top,
      },
    };
  } else {
    aggs[`${safeFieldName}_top`] = top;
  }

  const searchBody = {
    query,
    aggs: buildSamplerAggregation(aggs, samplerShardSize),
    ...(isPopulatedObject(runtimeFieldMap)
      ? { runtime_mappings: runtimeFieldMap }
      : {}),
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
  identifier: number
): Promise<NumericFieldStats> => {
  const { samplerShardSize } = params;

  const safeFieldName = getSafeAggregationName(field.fieldName, identifier);
  const request: SearchRequest = getNumericFieldStatsRequest(
    params,
    field.fieldName,
    safeFieldName
  );
  const { body } = await esClient.search(request);
  const aggregations = body.aggregations;
  const aggsPath = getSamplerAggregationsResponsePath(samplerShardSize);
  const docCount = get(
    aggregations,
    [...aggsPath, `${safeFieldName}_field_stats`, 'doc_count'],
    0
  );
  const fieldStatsResp = get(
    aggregations,
    [...aggsPath, `${safeFieldName}_field_stats`, 'actual_stats'],
    {}
  );

  const topAggsPath = [...aggsPath, `${safeFieldName}_top`];
  if (samplerShardSize < 1) {
    topAggsPath.push('top');
  }

  const topValues = get(aggregations, [...topAggsPath, 'buckets'], []);

  const stats: NumericFieldStats = {
    fieldName: field.fieldName,
    count: docCount,
    min: get(fieldStatsResp, 'min', 0),
    max: get(fieldStatsResp, 'max', 0),
    avg: get(fieldStatsResp, 'avg', 0),
    topValues,
    topValuesSampleSize: topValues.reduce(
      (acc: number, curr: TopValueBucket) => acc + curr.doc_count,
      get(aggregations, [...topAggsPath, 'sum_other_doc_count'], 0)
    ),
  };

  if (stats.count !== undefined && stats.count > 0) {
    const percentiles = get(
      aggregations,
      [...aggsPath, `${safeFieldName}_percentiles`, 'values'],
      []
    );
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
