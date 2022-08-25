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
  title: i18n.translate('xpack.apm.agentMetrics.serverless.computeUsage', {
    defaultMessage: 'Compute usage',
  }),
  key: 'compute_usage',
  type: 'linemark',
  yUnit: 'number',
  series: {
    computeUsage: {
      title: i18n.translate('xpack.apm.agentMetrics.serverless.computeUsage', {
        defaultMessage: 'Compute usage',
      }),
    },
  },
};

/**
 * To calculate the compute usage we need to multiple the "system.memory.total" by "faas.billed_duration".
 * But the result of this calculation is in Bytes-milliseconds, as the "system.memory.total" is stored in bytes and the "faas.billed_duration" is stored in milliseconds.
 * But to calculate the overall cost AWS uses GB-second, so we need to convert the result to this unit.
 */
const computeUsageScript = {
  lang: 'painless',
  source: `
    if(doc.containsKey('${METRIC_SYSTEM_TOTAL_MEMORY}') && doc.containsKey('${FAAS_BILLED_DURATION}')){
      double faasBilledDurationValueMs =  doc['${FAAS_BILLED_DURATION}'].value;
      double totalMemoryValueBytes = doc['${METRIC_SYSTEM_TOTAL_MEMORY}'].value;
      double bytesMsResult = totalMemoryValueBytes * faasBilledDurationValueMs;
      //Converts result in GB-seconds
      double gigabytesSecondsResult = bytesMsResult / (1024L*1024L*1024L*1000L);
      return gigabytesSecondsResult;
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
      computeUsage: { avg: { script: computeUsageScript } },
    },
    additionalFilters: [{ exists: { field: FAAS_COLDSTART_DURATION } }],
    operationName: 'get_compute_usage',
  });
}
