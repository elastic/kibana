/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricsAggregationResponsePart } from '../../../../../../typings/elasticsearch/aggregations';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRANSACTION_DURATION,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { environmentQuery, rangeQuery } from '../../../../common/utils/queries';
import { AlertParams } from '../../../routes/alerts/chart_preview';
import { withApmSpan } from '../../../utils/with_apm_span';
import { getBucketSize } from '../../helpers/get_bucket_size';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';

export function getTransactionDurationChartPreview({
  alertParams,
  setup,
}: {
  alertParams: AlertParams;
  setup: Setup & SetupTimeRange;
}) {
  return withApmSpan('get_transaction_duration_chart_preview', async () => {
    const { apmEventClient, start, end } = setup;
    const {
      aggregationType,
      environment,
      serviceName,
      transactionType,
    } = alertParams;

    const query = {
      bool: {
        filter: [
          { term: { [PROCESSOR_EVENT]: ProcessorEvent.transaction } },
          ...(serviceName ? [{ term: { [SERVICE_NAME]: serviceName } }] : []),
          ...(transactionType
            ? [{ term: { [TRANSACTION_TYPE]: transactionType } }]
            : []),
          ...rangeQuery(start, end),
          ...environmentQuery(environment),
        ],
      },
    };

    const { intervalString } = getBucketSize({ start, end, numBuckets: 20 });

    const aggs = {
      timeseries: {
        date_histogram: {
          field: '@timestamp',
          fixed_interval: intervalString,
        },
        aggs: {
          agg:
            aggregationType === 'avg'
              ? { avg: { field: TRANSACTION_DURATION } }
              : {
                  percentiles: {
                    field: TRANSACTION_DURATION,
                    percents: [aggregationType === '95th' ? 95 : 99],
                  },
                },
        },
      },
    };
    const params = {
      apm: { events: [ProcessorEvent.transaction] },
      body: { size: 0, query, aggs },
    };
    const resp = await apmEventClient.search(params);

    if (!resp.aggregations) {
      return [];
    }

    return resp.aggregations.timeseries.buckets.map((bucket) => {
      const percentilesKey = aggregationType === '95th' ? '95.0' : '99.0';
      const x = bucket.key;
      const y =
        aggregationType === 'avg'
          ? (bucket.agg as MetricsAggregationResponsePart).value
          : (bucket.agg as { values: Record<string, number | null> }).values[
              percentilesKey
            ];

      return { x, y };
    });
  });
}
