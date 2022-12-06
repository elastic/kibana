/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { SERVICE_NAME } from '../../../../../common/es_fields/apm';
import { AlertParams } from '../../route';
import { environmentQuery } from '../../../../../common/utils/environment_query';
import { APMEventClient } from '../../../../lib/helpers/create_es_client/create_apm_event_client';

export async function getTransactionErrorCountChartPreview({
  apmEventClient,
  alertParams,
}: {
  apmEventClient: APMEventClient;
  alertParams: AlertParams;
}) {
  const { serviceName, environment, interval, start, end } = alertParams;

  const query = {
    bool: {
      filter: [
        ...termQuery(SERVICE_NAME, serviceName),
        ...rangeQuery(start, end),
        ...environmentQuery(environment),
      ],
    },
  };

  const aggs = {
    timeseries: {
      date_histogram: {
        field: '@timestamp',
        fixed_interval: interval,
        extended_bounds: {
          min: start,
          max: end,
        },
      },
    },
  };

  const params = {
    apm: { events: [ProcessorEvent.error] },
    body: { size: 0, track_total_hits: false, query, aggs },
  };

  const resp = await apmEventClient.search(
    'get_error_count_chart_preview',
    params
  );

  if (!resp.aggregations) {
    return [];
  }

  return resp.aggregations.timeseries.buckets.map((bucket) => {
    return {
      x: bucket.key,
      y: bucket.doc_count,
    };
  });
}
