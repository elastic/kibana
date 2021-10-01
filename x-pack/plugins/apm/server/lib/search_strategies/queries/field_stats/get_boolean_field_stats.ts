/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import { SearchRequest } from '@elastic/elasticsearch/api/types';
import { get } from 'lodash';
import {
  buildSamplerAggregation,
  getSafeAggregationName,
  getSamplerAggregationsResponsePath,
} from '../../utils/field_stats_utils';
import { FieldValuePair } from '../../../../../common/search_strategies/types';
import {
  FieldStatsCommonRequestParams,
  BooleanFieldStats,
  Aggs,
} from '../../../../../common/search_strategies/field_stats_types';
import { getQueryWithParams } from '../get_query_with_params';
import { isPopulatedObject } from '../../../../../common/utils/object_utils';

export const getBooleanFieldStatsRequest = (
  params: FieldStatsCommonRequestParams,
  fieldName: string,
  safeFieldName: string
): SearchRequest => {
  const query = getQueryWithParams({ params });

  const { index, runtimeFieldMap, samplerShardSize } = params;

  const size = 0;
  const aggs: Aggs = {};

  aggs[`${safeFieldName}_value_count`] = {
    filter: { exists: { field: fieldName } },
  };
  aggs[`${safeFieldName}_values`] = {
    terms: {
      field: fieldName,
      size: 2,
    },
  };

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

export const fetchBooleanFieldStats = async (
  esClient: ElasticsearchClient,
  params: FieldStatsCommonRequestParams,
  field: FieldValuePair,
  identifier: number
): Promise<BooleanFieldStats> => {
  const { samplerShardSize } = params;

  const safeFieldName = getSafeAggregationName(field.fieldName, identifier);
  const request = getBooleanFieldStatsRequest(
    params,
    field.fieldName,
    safeFieldName
  );
  const { body } = await esClient.search(request);
  const aggregations = body.aggregations;
  const aggsPath = getSamplerAggregationsResponsePath(samplerShardSize);

  const stats: BooleanFieldStats = {
    fieldName: field.fieldName,
    count: get(
      aggregations,
      [...aggsPath, `${safeFieldName}_value_count`, 'doc_count'],
      0
    ),
    trueCount: 0,
    falseCount: 0,
  };

  const valueBuckets: Array<{ [key: string]: number }> = get(
    aggregations,
    [...aggsPath, `${safeFieldName}_values`, 'buckets'],
    []
  );
  valueBuckets.forEach((bucket) => {
    stats[`${bucket.key_as_string}Count`] = bucket.doc_count;
  });
  return stats;
};
