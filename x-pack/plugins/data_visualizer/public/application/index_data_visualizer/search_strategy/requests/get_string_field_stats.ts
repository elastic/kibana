/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import { SearchRequest } from '@elastic/elasticsearch/api/types';
import { get } from 'lodash';
import { SAMPLER_TOP_TERMS_SHARD_SIZE, SAMPLER_TOP_TERMS_THRESHOLD } from './constants';
import {
  buildBaseFilterCriteria,
  buildSamplerAggregation,
  getSamplerAggregationsResponsePath,
} from '../../../../../common/utils/query_utils';
import { isPopulatedObject } from '../../../../../common/utils/object_utils';
import type { FieldStatsCommonRequestParams } from '../../../../../common/search_strategy/types';
import type { Aggs, Bucket, Field, StringFieldStats } from '../../types/field_stats';

export const getStringFieldStatsRequest = (params: FieldStatsCommonRequestParams, field: Field) => {
  const { index, timeFieldName, earliestMs, latestMs, query, runtimeFieldMap, samplerShardSize } =
    params;

  const size = 0;
  const filterCriteria = buildBaseFilterCriteria(timeFieldName, earliestMs, latestMs, query);

  const aggs: Aggs = {};

  const safeFieldName = field.safeFieldName;
  const top = {
    terms: {
      field: field.fieldName,
      size: 10,
      order: {
        _count: 'desc',
      },
    },
  };

  // If cardinality >= SAMPLE_TOP_TERMS_THRESHOLD, run the top terms aggregation
  // in a sampler aggregation, even if no sampling has been specified (samplerShardSize < 1).
  if (samplerShardSize < 1 && field.cardinality >= SAMPLER_TOP_TERMS_THRESHOLD) {
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

export const fetchStringFieldStats = async (
  esClient: ElasticsearchClient,
  params: FieldStatsCommonRequestParams,
  field: Field
): Promise<StringFieldStats> => {
  const { samplerShardSize } = params;
  const request: SearchRequest = getStringFieldStatsRequest(params, field);

  const { body } = await esClient.search(request);

  const aggregations = body.aggregations;
  const aggsPath = getSamplerAggregationsResponsePath(samplerShardSize);

  const safeFieldName = field.safeFieldName;

  const topAggsPath = [...aggsPath, `${safeFieldName}_top`];
  if (samplerShardSize < 1 && field.cardinality >= SAMPLER_TOP_TERMS_THRESHOLD) {
    topAggsPath.push('top');
  }

  const topValues: Bucket[] = get(aggregations, [...topAggsPath, 'buckets'], []);

  const stats = {
    fieldName: field.fieldName,
    isTopValuesSampled: field.cardinality >= SAMPLER_TOP_TERMS_THRESHOLD || samplerShardSize > 0,
    topValues,
    topValuesSampleSize: topValues.reduce(
      (acc, curr) => acc + curr.doc_count,
      get(aggregations, [...topAggsPath, 'sum_other_doc_count'], 0)
    ),
    topValuesSamplerShardSize:
      field.cardinality >= SAMPLER_TOP_TERMS_THRESHOLD
        ? SAMPLER_TOP_TERMS_SHARD_SIZE
        : samplerShardSize,
  };

  return stats;
};
