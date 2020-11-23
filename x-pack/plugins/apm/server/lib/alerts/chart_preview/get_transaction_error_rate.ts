/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { rangeFilter } from '../../../../common/utils/range_filter';
import { AlertParams } from '../../../routes/alerts/transaction_error_rate_chart_preview';
import { getEnvironmentUiFilterES } from '../../helpers/convert_ui_filters/get_environment_ui_filter_es';
import { getBucketSize } from '../../helpers/get_bucket_size';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import {
  calculateTransactionErrorPercentage,
  getOutcomeAggregation,
} from '../../helpers/transaction_error_rate';

export async function getTransactionErrorRateChartPreview({
  setup,
  alertParams,
}: {
  setup: Setup & SetupTimeRange;
  alertParams: AlertParams;
}) {
  const { start, end, apmEventClient } = setup;
  const { intervalString } = getBucketSize({ start, end });
  const { threshold, serviceName, transactionType, environment } = alertParams;

  const query = {
    bool: {
      filter: [
        { range: rangeFilter(start, end) },
        { term: { [PROCESSOR_EVENT]: ProcessorEvent.transaction } },
        ...(serviceName ? [{ term: { [SERVICE_NAME]: serviceName } }] : []),
        ...(transactionType
          ? [{ term: { [TRANSACTION_TYPE]: transactionType } }]
          : []),
        ...getEnvironmentUiFilterES(environment),
      ],
    },
  };

  const outcomes = getOutcomeAggregation({
    searchAggregatedTransactions: false,
  });

  const aggs = {
    outcomes,
    timeseries: {
      date_histogram: {
        field: '@timestamp',
        fixed_interval: intervalString,
        min_doc_count: 0,
        extended_bounds: { min: start, max: end },
      },
      aggs: { outcomes },
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
    const errorPercentage = calculateTransactionErrorPercentage(
      bucket.outcomes
    );
    return {
      x: bucket.key,
      y: errorPercentage > threshold ? errorPercentage : null,
    };
  });
}
