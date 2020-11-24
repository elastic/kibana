/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SERVICE_NAME } from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { AlertParams } from '../../../routes/alerts/chart_preview';
import { getEnvironmentUiFilterES } from '../../helpers/convert_ui_filters/get_environment_ui_filter_es';
import { Setup } from '../../helpers/setup_request';

const BUCKET_SIZE = 20;

export async function getTransactionErrorCountChartPreview({
  setup,
  alertParams,
}: {
  setup: Setup;
  alertParams: AlertParams;
}) {
  const { apmEventClient } = setup;
  const {
    windowSize,
    windowUnit,
    threshold,
    serviceName,
    environment,
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
        ...(serviceName ? [{ term: { [SERVICE_NAME]: serviceName } }] : []),
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
    const errorCount = ;
    return {
      x: bucket.key,
      y: bucket.doc_count
    };
  });
}
