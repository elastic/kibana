/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { get } from 'lodash';
import type { ElasticsearchClient } from 'kibana/server';
import type { SearchRequest } from '@elastic/elasticsearch/api/types';
import {
  buildBaseFilterCriteria,
  buildSamplerAggregation,
  getSamplerAggregationsResponsePath,
} from '../../../../../common/utils/query_utils';
import { isPopulatedObject } from '../../../../../common/utils/object_utils';
import type { FieldStatsCommonRequestParams } from '../../../../../common/search_strategy/types';
import type { Field, BooleanFieldStats, Aggs } from '../../types/field_stats';

export const getBooleanFieldStatsRequest = (
  params: FieldStatsCommonRequestParams,
  field: Field
) => {
  const { index, timeFieldName, earliestMs, latestMs, query, runtimeFieldMap, samplerShardSize } =
    params;

  const size = 0;
  const filterCriteria = buildBaseFilterCriteria(timeFieldName, earliestMs, latestMs, query);
  const aggs: Aggs = {};

  const safeFieldName = field.safeFieldName;
  aggs[`${safeFieldName}_value_count`] = {
    filter: { exists: { field: field.fieldName } },
  };
  aggs[`${safeFieldName}_values`] = {
    terms: {
      field: field.fieldName,
      size: 2,
    },
  };

  const searchBody = {
    query: {
      bool: {
        filter: filterCriteria,
      },
    },
    aggs: buildSamplerAggregation(aggs, samplerShardSize),
    ...(isPopulatedObject(runtimeFieldMap) ? { runtime_mappings: runtimeFieldMap } : {}),
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
  field: Field
): Promise<BooleanFieldStats> => {
  const { samplerShardSize } = params;
  const request: SearchRequest = getBooleanFieldStatsRequest(params, field);
  const { body } = await esClient.search(request);
  const aggregations = body.aggregations;
  const aggsPath = getSamplerAggregationsResponsePath(samplerShardSize);

  const safeFieldName = field.safeFieldName;
  const stats: BooleanFieldStats = {
    fieldName: field.fieldName,
    count: get(aggregations, [...aggsPath, `${safeFieldName}_value_count`, 'doc_count'], 0),
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
