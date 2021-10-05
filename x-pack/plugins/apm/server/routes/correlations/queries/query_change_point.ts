/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { uniqBy } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient } from 'kibana/server';
import { CorrelationsParams } from '../../../../common/correlations/types';
import { ChangePointParams } from '../../../../common/correlations/change_point/types';
import { getCorrelationsFilters } from './get_filters';
import { getRequestBase } from './get_request_base';

export const getChangePointRequest = (
  params: ChangePointParams & CorrelationsParams,
  fieldName: string
): estypes.SearchRequest => {
  const {
    environment,
    kuery,
    serviceName,
    transactionType,
    transactionName,
    start,
    end,
  } = params;

  const correlationFilters = getCorrelationsFilters({
    environment,
    kuery,
    serviceName,
    transactionType,
    transactionName,
    start,
    end,
  });

  const query = {
    bool: {
      filter: [...correlationFilters] as estypes.QueryDslQueryContainer[],
    },
  };

  const { filter } = query.bool;

  query.bool.filter = [
    ...filter,
    {
      range: {
        '@timestamp': {
          gte: params?.deviationMin,
          lt: params?.deviationMax,
        },
      },
    },
  ];

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
                    '@timestamp': {
                      gte: params?.baselineMin,
                      lt: params?.baselineMax,
                    },
                  },
                },
              ],
            },
          },
          p_value: { background_is_superset: false },
        },
      },
    },
  };

  return {
    ...getRequestBase(params),
    body,
  };
};

export const fetchChangePointPValues = async (
  esClient: ElasticsearchClient,
  params: ChangePointParams & CorrelationsParams,
  fieldNames: string[]
) => {
  const result = [];

  for (const fieldName of fieldNames) {
    const resp = await esClient.search(
      getChangePointRequest(params, fieldName)
    );

    if (resp.body.aggregations === undefined) {
      throw new Error('fetchChangePoint failed, did not return aggregations.');
    }

    const overallResult = resp.body.aggregations
      .change_point_p_value as estypes.AggregationsSignificantTermsAggregate<{
      key: string | number;
      doc_count: number;
      bg_count: number;
      score: number;
    }>;

    // Using for of to sequentially augment the results with histogram data.
    for (const bucket of overallResult.buckets) {
      // Scale the score into a value from 0 - 1
      // using a concave piecewise linear function in -log(p-value)
      const normalizedScore =
        0.5 * Math.min(Math.max((bucket.score - 3.912) / 2.995, 0), 1) +
        0.25 * Math.min(Math.max((bucket.score - 6.908) / 6.908, 0), 1) +
        0.25 * Math.min(Math.max((bucket.score - 13.816) / 101.314, 0), 1);

      const pValue = Math.exp(-bucket.score);

      if (typeof pValue === 'number' && pValue < ERROR_CORRELATION_THRESHOLD) {
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

  return uniqBy(result, (d) => `${d.fieldName},${d.fieldValue}`);
};
