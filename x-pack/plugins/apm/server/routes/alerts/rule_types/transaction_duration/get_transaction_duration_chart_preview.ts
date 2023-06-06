/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import {
  AggregationType,
  ApmRuleType,
} from '../../../../../common/rules/apm_rule_types';
import {
  SERVICE_NAME,
  TRANSACTION_TYPE,
  TRANSACTION_NAME,
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
  averageOrPercentileAgg,
  getMultiTermsSortOrder,
} from './average_or_percentile_agg';
import { APMConfig } from '../../../..';
import { APMEventClient } from '../../../../lib/helpers/create_es_client/create_apm_event_client';
import { getGroupByTerms } from '../utils/get_groupby_terms';
import { getAllGroupByFields } from '../../../../../common/rules/get_all_groupby_fields';
import { getIntervalInSeconds } from '../utils/get_interval_in_seconds';

export type TransactionDurationChartPreviewResponse = Array<{
  name: string;
  data: Array<{ x: number; y: number | null }>;
}>;

export async function getTransactionDurationChartPreview({
  alertParams,
  config,
  apmEventClient,
}: {
  alertParams: AlertParams;
  config: APMConfig;
  apmEventClient: APMEventClient;
}): Promise<TransactionDurationChartPreviewResponse> {
  const {
    aggregationType = AggregationType.Avg,
    environment,
    serviceName,
    transactionType,
    transactionName,
    interval,
    end,
    groupBy,
  } = alertParams;
  const searchAggregatedTransactions = await getSearchTransactionsEvents({
    config,
    apmEventClient,
    kuery: '',
  });

  const intervalAsSeconds = getIntervalInSeconds(interval);
  const intervalAsMs = intervalAsSeconds * 1000;
  const start = end - intervalAsMs;

  const query = {
    bool: {
      filter: [
        ...termQuery(SERVICE_NAME, serviceName, {
          queryEmptyString: false,
        }),
        ...termQuery(TRANSACTION_TYPE, transactionType, {
          queryEmptyString: false,
        }),
        ...termQuery(TRANSACTION_NAME, transactionName, {
          queryEmptyString: false,
        }),
        ...rangeQuery(start, end),
        ...environmentQuery(environment),
        ...getDocumentTypeFilterForTransactions(searchAggregatedTransactions),
      ] as QueryDslQueryContainer[],
    },
  };

  const transactionDurationField = getDurationFieldForTransactions(
    searchAggregatedTransactions
  );

  const allGroupByFields = getAllGroupByFields(
    ApmRuleType.TransactionDuration,
    groupBy
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
        series: {
          multi_terms: {
            terms: [...getGroupByTerms(allGroupByFields)],
            size: 1000,
            ...getMultiTermsSortOrder(aggregationType),
          },
          aggs: {
            ...averageOrPercentileAgg({
              aggregationType,
              transactionDurationField,
            }),
          },
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

  const seriesDataMap = resp.aggregations.timeseries.buckets.reduce(
    (acc, bucket) => {
      const x = bucket.key;
      bucket.series.buckets.forEach((seriesBucket) => {
        const bucketKey = seriesBucket.key.join('_');
        const y =
          'avgLatency' in seriesBucket
            ? seriesBucket.avgLatency.value
            : seriesBucket.pctLatency.values[0].value;
        if (acc[bucketKey]) {
          acc[bucketKey].push({ x, y });
        } else {
          acc[bucketKey] = [{ x, y }];
        }
      });

      return acc;
    },
    {} as Record<string, Array<{ x: number; y: number | null }>>
  );

  return Object.keys(seriesDataMap).map((key) => ({
    name: key,
    data: seriesDataMap[key],
  }));
}
