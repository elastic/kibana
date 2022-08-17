/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  FAAS_BILLED_DURATION,
  TRANSACTION_DURATION_HISTOGRAM,
} from '../../../../../common/elasticsearch_fieldnames';
import { Setup } from '../../../../lib/helpers/setup_request';
import {
  fetchAndTransformMetrics,
  GenericMetricsChart,
} from '../../fetch_and_transform_metrics';
import { ChartBase } from '../../types';

const billedDurationAvg = {
  title: i18n.translate('xpack.apm.agentMetrics.serverless.billedDurationAvg', {
    defaultMessage: 'Billed Duration',
  }),
};

const transactionDurationAvg = {
  title: i18n.translate(
    'xpack.apm.agentMetrics.serverless.transactionDuration',
    { defaultMessage: 'Transaction Duration' }
  ),
};

const chartBase: ChartBase = {
  title: i18n.translate('xpack.apm.agentMetrics.serverless.avgDuration', {
    defaultMessage: 'Avg. Duration',
  }),
  key: 'avg_duration',
  type: 'linemark',
  yUnit: 'number',
  series: {},
};

export async function getDuration({
  environment,
  kuery,
  setup,
  serviceName,
  serviceNodeName,
  start,
  end,
}: {
  environment: string;
  kuery: string;
  setup: Setup;
  serviceName: string;
  serviceNodeName?: string;
  start: number;
  end: number;
}): Promise<GenericMetricsChart> {
  const options = {
    environment,
    kuery,
    setup,
    serviceName,
    serviceNodeName,
    start,
    end,
  };

  const billedDurationMetrics = await fetchAndTransformMetrics({
    ...options,
    chartBase: { ...chartBase, series: { billedDurationAvg } },
    aggs: {
      billedDurationAvg: { avg: { field: FAAS_BILLED_DURATION } },
    },
    additionalFilters: [{ exists: { field: FAAS_BILLED_DURATION } }],
    operationName: 'get_billed_duration',
  });

  const transactionDurationMetrics = await fetchAndTransformMetrics({
    ...options,
    chartBase: { ...chartBase, series: { transactionDurationAvg } },
    aggs: {
      transactionDurationAvg: {
        avg: { field: TRANSACTION_DURATION_HISTOGRAM },
      },
    },
    additionalFilters: [{ exists: { field: TRANSACTION_DURATION_HISTOGRAM } }],
    operationName: 'get_transaction_duration',
  });

  return {
    ...billedDurationMetrics,
    series: [
      ...billedDurationMetrics.series,
      ...transactionDurationMetrics.series,
    ],
  };
}
