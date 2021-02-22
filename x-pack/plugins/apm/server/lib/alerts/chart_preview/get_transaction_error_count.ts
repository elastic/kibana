/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SERVICE_NAME } from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { AlertParams } from '../../../routes/alerts/chart_preview';
import { environmentQuery, rangeQuery } from '../../../../common/utils/queries';
import { withApmSpan } from '../../../utils/with_apm_span';
import { getBucketSize } from '../../helpers/get_bucket_size';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';

export function getTransactionErrorCountChartPreview({
  setup,
  alertParams,
}: {
  setup: Setup & SetupTimeRange;
  alertParams: AlertParams;
}) {
  return withApmSpan('get_transaction_error_count_chart_preview', async () => {
    const { apmEventClient, start, end } = setup;
    const { serviceName, environment } = alertParams;

    const query = {
      bool: {
        filter: [
          ...(serviceName ? [{ term: { [SERVICE_NAME]: serviceName } }] : []),
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
      },
    };

    const params = {
      apm: { events: [ProcessorEvent.error] },
      body: { size: 0, query, aggs },
    };

    const resp = await apmEventClient.search(params);

    if (!resp.aggregations) {
      return [];
    }

    return resp.aggregations.timeseries.buckets.map((bucket) => {
      return {
        x: bucket.key,
        y: bucket.doc_count,
      };
    });
  });
}
