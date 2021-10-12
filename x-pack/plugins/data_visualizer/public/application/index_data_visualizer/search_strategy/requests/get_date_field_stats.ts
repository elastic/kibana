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
  buildBaseFilterCriteria,
  buildSamplerAggregation,
  getSamplerAggregationsResponsePath,
} from '../../../../../common/utils/query_utils';
import { isPopulatedObject } from '../../../../../common/utils/object_utils';
import type { FieldStatsCommonRequestParams } from '../../../../../common/search_strategy/types';
import type { Field, DateFieldStats, Aggs } from '../../types/field_stats';

export const getDateFieldStatsRequest = (params: FieldStatsCommonRequestParams, field: Field) => {
  const { index, timeFieldName, earliestMs, latestMs, query, runtimeFieldMap, samplerShardSize } =
    params;

  const size = 0;
  const filterCriteria = buildBaseFilterCriteria(timeFieldName, earliestMs, latestMs, query);

  const aggs: Aggs = {};
  const safeFieldName = field.safeFieldName;
  aggs[`${safeFieldName}_field_stats`] = {
    filter: { exists: { field: field.fieldName } },
    aggs: {
      actual_stats: {
        stats: { field: field.fieldName },
      },
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

export const fetchDateFieldStats = async (
  esClient: ElasticsearchClient,
  params: FieldStatsCommonRequestParams,
  field: Field
): Promise<DateFieldStats> => {
  const { samplerShardSize } = params;

  const request: SearchRequest = getDateFieldStatsRequest(params, field);
  const { body } = await esClient.search(request);

  const aggregations = body.aggregations;
  const aggsPath = getSamplerAggregationsResponsePath(samplerShardSize);
  const safeFieldName = field.safeFieldName;
  const docCount = get(aggregations, [...aggsPath, `${safeFieldName}_field_stats`, 'doc_count'], 0);
  const fieldStatsResp = get(
    aggregations,
    [...aggsPath, `${safeFieldName}_field_stats`, 'actual_stats'],
    {}
  );
  return {
    fieldName: field.fieldName,
    count: docCount,
    earliest: get(fieldStatsResp, 'min', 0),
    latest: get(fieldStatsResp, 'max', 0),
  };
};
