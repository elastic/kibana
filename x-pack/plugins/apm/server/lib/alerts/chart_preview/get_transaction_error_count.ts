/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SERVICE_NAME } from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { rangeFilter } from '../../../../common/utils/range_filter';
import { ErrorCountAlertParams } from '../../../routes/alerts/chart_preview';
import { getEnvironmentUiFilterES } from '../../helpers/convert_ui_filters/get_environment_ui_filter_es';
import { getBucketSize } from '../../helpers/get_bucket_size';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';

export async function getTransactionErrorCountChartPreview({
  setup,
  alertParams,
}: {
  setup: Setup & SetupTimeRange;
  alertParams: ErrorCountAlertParams;
}) {
  const { start, end, apmEventClient } = setup;
  const { intervalString } = getBucketSize({ start, end });
  const { threshold, serviceName, environment } = alertParams;

  const query = {
    bool: {
      filter: [
        { range: rangeFilter(start, end) },
        ...(serviceName ? [{ term: { [SERVICE_NAME]: serviceName } }] : []),
        ...getEnvironmentUiFilterES(environment),
      ],
    },
  };

  const aggs = {
    timeseries: {
      date_histogram: {
        field: '@timestamp',
        fixed_interval: intervalString,
        min_doc_count: 0,
        extended_bounds: { min: start, max: end },
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
    const errorCount = bucket.doc_count;
    return {
      x: bucket.key,
      y: errorCount > threshold ? errorCount : null,
    };
  });
}
