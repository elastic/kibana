/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MetricsAggregationResponsePart } from '../../../../../../typings/elasticsearch/aggregations';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRANSACTION_DURATION,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { AlertParams } from '../../../routes/alerts/chart_preview';
import { getEnvironmentUiFilterES } from '../../helpers/convert_ui_filters/get_environment_ui_filter_es';
import { Setup } from '../../helpers/setup_request';

const BUCKET_SIZE = 20;

export async function getTransactionDurationChartPreview({
  alertParams,
  setup,
}: {
  alertParams: AlertParams;
  setup: Setup;
}) {
  const { apmEventClient } = setup;
  const {
    aggregationType,
    environment,
    serviceName,
    transactionType,
    windowSize,
    windowUnit,
  } = alertParams;

  const query = {
    bool: {
      filter: [
        {
          range: {
            '@timestamp': {
              gte: `now-${windowSize * BUCKET_SIZE}${windowUnit}`,
            },
          },
        },
        { term: { [PROCESSOR_EVENT]: ProcessorEvent.transaction } },
        ...(serviceName ? [{ term: { [SERVICE_NAME]: serviceName } }] : []),
        ...(transactionType
          ? [{ term: { [TRANSACTION_TYPE]: transactionType } }]
          : []),
        ...getEnvironmentUiFilterES(environment),
      ],
    },
  };

  const aggs = {
    timeseries: {
      date_histogram: {
        field: '@timestamp',
        fixed_interval: `${windowSize}${windowUnit}`,
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
    return { x, y: y === null ? null : y / 1000 };
  });
}
