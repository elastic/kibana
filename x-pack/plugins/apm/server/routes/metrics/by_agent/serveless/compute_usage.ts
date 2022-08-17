/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  FAAS_BILLED_DURATION,
  FAAS_COLDSTART_DURATION,
  METRIC_SYSTEM_TOTAL_MEMORY,
} from '../../../../../common/elasticsearch_fieldnames';
import { Setup } from '../../../../lib/helpers/setup_request';
import { fetchAndTransformMetrics } from '../../fetch_and_transform_metrics';
import { ChartBase } from '../../types';

const chartBase: ChartBase = {
  title: i18n.translate('xpack.apm.agentMetrics.serveless.computeUsage', {
    defaultMessage: 'Compute usage',
  }),
  key: 'cold_start',
  type: 'linemark',
  yUnit: 'number',
  series: {
    computeUsage: {
      title: i18n.translate('xpack.apm.agentMetrics.serveless.computeUsage', {
        defaultMessage: 'Compute usage',
      }),
    },
  },
};

const computeUsageScript = {
  lang: 'painless',
  source: `
    if(doc.containsKey('${METRIC_SYSTEM_TOTAL_MEMORY}') && doc.containsKey('${FAAS_BILLED_DURATION}')){
      double faasBilledDurationValue =  doc['${FAAS_BILLED_DURATION}'].value;
      double totalMemoryValue = doc['${METRIC_SYSTEM_TOTAL_MEMORY}'].value;
      return totalMemoryValue * faasBilledDurationValue
    }
    
    return null;
  `,
} as const;

export function getComputeUsage({
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
}) {
  return fetchAndTransformMetrics({
    environment,
    kuery,
    setup,
    serviceName,
    serviceNodeName,
    start,
    end,
    chartBase,
    aggs: {
      computeUsage: { sum: { script: computeUsageScript } },
    },
    additionalFilters: [{ exists: { field: FAAS_COLDSTART_DURATION } }],
    operationName: 'get_compute_usage',
  });
}
