/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import {
  AggregationsAggregationContainer,
  SearchRequest,
} from '@elastic/elasticsearch/api/types';
import { get } from 'lodash';
import { FieldValuePair } from '../../../../../common/search_strategies/types';
import { getQueryWithParams } from '../get_query_with_params';
import {
  buildSamplerAggregation,
  getSafeAggregationName,
  getSamplerAggregationsResponsePath,
} from '../../utils/field_stats_utils';
import { SAMPLER_TOP_TERMS_SHARD_SIZE } from '../../constants';
import {
  FieldStatsCommonRequestParams,
  KeywordFieldStats,
  Aggs,
  TopValueBucket,
} from '../../../../../common/search_strategies/field_stats_types';
import { isPopulatedObject } from '../../../../../common/utils/object_utils';

export const getKeywordFieldStatsRequest = (
  params: FieldStatsCommonRequestParams,
  fieldName: string,
  safeFieldName: string
): SearchRequest => {
  const query = getQueryWithParams({ params });

  const { index, runtimeFieldMap, samplerShardSize } = params;

  const size = 0;
  const aggs: Aggs = {};

  const top: AggregationsAggregationContainer = {
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

export const fetchKeywordFieldStats = async (
  esClient: ElasticsearchClient,
  params: FieldStatsCommonRequestParams,
  field: FieldValuePair,
  identifier: number
): Promise<KeywordFieldStats> => {
  const { samplerShardSize } = params;

  const safeFieldName = getSafeAggregationName(field.fieldName, identifier);
  const request = getKeywordFieldStatsRequest(
    params,
    field.fieldName,
    safeFieldName
  );
  const { body } = await esClient.search(request);
  const aggregations = body.aggregations;
  const aggsPath = getSamplerAggregationsResponsePath(samplerShardSize);

  const topAggsPath = [...aggsPath, `${safeFieldName}_top`];
  if (samplerShardSize < 1) {
    topAggsPath.push('top');
  }

  const topValues: TopValueBucket[] = get(
    aggregations,
    [...topAggsPath, 'buckets'],
    []
  );

  const stats = {
    fieldName: field.fieldName,
    topValues,
    topValuesSampleSize: topValues.reduce(
      (acc, curr) => acc + curr.doc_count,
      get(aggregations, [...topAggsPath, 'sum_other_doc_count'], 0)
    ),
  };

  return stats;
};
