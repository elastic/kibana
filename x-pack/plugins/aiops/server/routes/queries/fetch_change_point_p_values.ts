/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { uniqBy } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient } from '@kbn/core/server';

import { SPIKE_ANALYSIS_THRESHOLD } from '../../../common/constants';
import type { AiopsExplainLogRateSpikesSchema } from '../../../common/api/explain_log_rate_spikes';
import { ChangePoint } from '../../../common/types';

import { getQueryWithParams } from './get_query_with_params';
import { getRequestBase } from './get_request_base';

export const getChangePointRequest = (
  params: AiopsExplainLogRateSpikesSchema,
  fieldName: string
): estypes.SearchRequest => {
  const query = getQueryWithParams({
    params,
  });

  const timeFieldName = params.timeFieldName ?? '@timestamp';

  let filter: estypes.QueryDslQueryContainer[] = [];

  if (Array.isArray(query.bool.filter)) {
    filter = query.bool.filter.filter((d) => Object.keys(d)[0] !== 'range');

    query.bool.filter = [
      ...filter,
      {
        range: {
          [timeFieldName]: {
            gte: params.deviationMin,
            lt: params.deviationMax,
            format: 'epoch_millis',
          },
        },
      },
    ];
  }

  const body = {
    query,
    size: 0,
    aggs: {
      change_point_p_value: {
        significant_terms: {
          field: fieldName,
          background_filter: {
            bool: {
              filter: [
                ...filter,
                {
                  range: {
                    [timeFieldName]: {
                      gte: params.baselineMin,
                      lt: params.baselineMax,
                      format: 'epoch_millis',
                    },
                  },
                },
              ],
            },
          },
          p_value: { background_is_superset: false },
          size: 1000,
        },
      },
    },
  };

  return {
    ...getRequestBase(params),
    body,
  };
};

interface Aggs extends estypes.AggregationsSignificantLongTermsAggregate {
  doc_count: number;
  bg_count: number;
  buckets: estypes.AggregationsSignificantLongTermsBucket[];
}

export const fetchChangePointPValues = async (
  esClient: ElasticsearchClient,
  params: AiopsExplainLogRateSpikesSchema,
  fieldNames: string[]
) => {
  const result: ChangePoint[] = [];

  for (const fieldName of fieldNames) {
    const request = getChangePointRequest(params, fieldName);
    const resp = await esClient.search<unknown, { change_point_p_value: Aggs }>(request);

    if (resp.aggregations === undefined) {
      throw new Error('fetchChangePoint failed, did not return aggregations.');
    }

    const overallResult = resp.aggregations.change_point_p_value;

    // Using for of to sequentially augment the results with histogram data.
    for (const bucket of overallResult.buckets) {
      // Scale the score into a value from 0 - 1
      // using a concave piecewise linear function in -log(p-value)
      const normalizedScore =
        0.5 * Math.min(Math.max((bucket.score - 3.912) / 2.995, 0), 1) +
        0.25 * Math.min(Math.max((bucket.score - 6.908) / 6.908, 0), 1) +
        0.25 * Math.min(Math.max((bucket.score - 13.816) / 101.314, 0), 1);

      const pValue = Math.exp(-bucket.score);

      if (typeof pValue === 'number' && pValue < SPIKE_ANALYSIS_THRESHOLD) {
        result.push({
          fieldName,
          fieldValue: bucket.key,
          doc_count: bucket.doc_count,
          bg_count: bucket.doc_count,
          score: bucket.score,
          pValue,
          normalizedScore,
        });
      }
    }
  }

  return {
    changePoints: uniqBy(result, (d) => `${d.fieldName},${d.fieldValue}`),
  };
};
