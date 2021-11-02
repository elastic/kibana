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
  FieldValueFieldStats,
  Aggs,
  TopValueBucket,
} from '../../../../../common/correlations/field_stats_types';
import { buildSamplerAggregation } from '../../utils/field_stats_utils';
import { getQueryWithParams } from '../get_query_with_params';

export const getFieldValueFieldStatsRequest = (
  params: FieldStatsCommonRequestParams,
  field?: FieldValuePair
): estypes.SearchRequest => {
  const query = getQueryWithParams({ params });

  const { index, samplerShardSize } = params;

  const size = 0;
  const aggs: Aggs = {
    filtered_count: {
      filter: {
        term: {
          [`${field?.fieldName}`]: field?.fieldValue,
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

export const fetchFieldValueFieldStats = async (
  esClient: ElasticsearchClient,
  params: FieldStatsCommonRequestParams,
  field: FieldValuePair
): Promise<FieldValueFieldStats> => {
  const request = getFieldValueFieldStatsRequest(params, field);

  const { body } = await esClient.search(request);
  const aggregations = body.aggregations as {
    sample: {
      doc_count: number;
      filtered_count: estypes.AggregationsFiltersBucketItemKeys;
    };
  };
  const topValues: TopValueBucket[] = [
    {
      key: field.fieldValue,
      doc_count: aggregations.sample.filtered_count.doc_count,
    },
  ];

  const stats = {
    fieldName: field.fieldName,
    topValues,
    topValuesSampleSize: aggregations.sample.doc_count ?? 0,
  };

  return stats;
};
