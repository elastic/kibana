/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { AggregationType } from '../../../../../common/rules/apm_rule_types';
import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  TRANSACTION_TYPE,
} from '../../../../../common/es_fields/apm';
import { environmentQuery } from '../../../../../common/utils/environment_query';
import { AlertParams } from '../../route';
import {
  getSearchTransactionsEvents,
  getDocumentTypeFilterForTransactions,
  getDurationFieldForTransactions,
  getProcessorEventForTransactions,
} from '../../../../lib/helpers/transactions';
import {
  ENVIRONMENT_NOT_DEFINED,
  getEnvironmentLabel,
} from '../../../../../common/environment_filter_values';
import { averageOrPercentileAgg } from './average_or_percentile_agg';
import { APMConfig } from '../../../..';
import { APMEventClient } from '../../../../lib/helpers/create_es_client/create_apm_event_client';

export async function getTransactionDurationChartPreview({
  alertParams,
  config,
  apmEventClient,
}: {
  alertParams: AlertParams;
  config: APMConfig;
  apmEventClient: APMEventClient;
}) {
  const {
    aggregationType = AggregationType.Avg,
    environment,
    serviceName,
    transactionType,
    interval,
    start,
    end,
  } = alertParams;
  const searchAggregatedTransactions = await getSearchTransactionsEvents({
    config,
    apmEventClient,
    kuery: '',
  });

  const query = {
    bool: {
      filter: [
        ...termQuery(SERVICE_NAME, serviceName),
        ...termQuery(TRANSACTION_TYPE, transactionType),
        ...rangeQuery(start, end),
        ...environmentQuery(environment),
        ...getDocumentTypeFilterForTransactions(searchAggregatedTransactions),
      ] as QueryDslQueryContainer[],
    },
  };

  const transactionDurationField = getDurationFieldForTransactions(
    searchAggregatedTransactions
  );

  const aggs = {
    timeseries: {
      date_histogram: {
        field: '@timestamp',
        fixed_interval: interval,
        min_doc_count: 0,
        extended_bounds: {
          min: start,
          max: end,
        },
      },
      aggs: {
        environment: {
          terms: {
            field: SERVICE_ENVIRONMENT,
            missing: ENVIRONMENT_NOT_DEFINED.value,
            size: 10,
            order: {
              [aggregationType === AggregationType.Avg
                ? 'avgLatency'
                : `pctLatency.${
                    aggregationType === AggregationType.P95 ? 95 : 99
                  }`]: 'desc',
            } as Record<string, 'desc'>,
          },
          aggs: averageOrPercentileAgg({
            aggregationType,
            transactionDurationField,
          }),
        },
      },
    },
  };
  const params = {
    apm: {
      events: [getProcessorEventForTransactions(searchAggregatedTransactions)],
    },
    body: { size: 0, track_total_hits: false, query, aggs },
  };
  const resp = await apmEventClient.search(
    'get_transaction_duration_chart_preview',
    params
  );

  if (!resp.aggregations) {
    return [];
  }

  const environmentDataMap = resp.aggregations.timeseries.buckets.reduce(
    (acc, bucket) => {
      const x = bucket.key;
      bucket.environment.buckets.forEach((environmentBucket) => {
        const env = environmentBucket.key as string;
        const y =
          'avgLatency' in environmentBucket
            ? environmentBucket.avgLatency.value
            : environmentBucket.pctLatency.values[0].value;
        if (acc[env]) {
          acc[env].push({ x, y });
        } else {
          acc[env] = [{ x, y }];
        }
      });

      return acc;
    },
    {} as Record<string, Array<{ x: number; y: number | null }>>
  );

  return Object.keys(environmentDataMap).map((env) => ({
    name: getEnvironmentLabel(env),
    data: environmentDataMap[env],
  }));
}
