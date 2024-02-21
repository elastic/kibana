/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IndicatorType } from '@kbn/slo-schema';
import {
  INDICATOR_APM_AVAILABILITY,
  INDICATOR_APM_LATENCY,
  INDICATOR_CUSTOM_KQL,
  INDICATOR_CUSTOM_METRIC,
  INDICATOR_HISTOGRAM,
  INDICATOR_TIMESLICE_METRIC,
} from '../../utils/labels';
export const SLI_OPTIONS: Array<{
  value: IndicatorType;
  text: string;
}> = [
  {
    value: 'sli.kql.custom',
    text: INDICATOR_CUSTOM_KQL,
  },
  {
    value: 'sli.metric.custom',
    text: INDICATOR_CUSTOM_METRIC,
  },
  {
    value: 'sli.metric.timeslice',
    text: INDICATOR_TIMESLICE_METRIC,
  },
  {
    value: 'sli.histogram.custom',
    text: INDICATOR_HISTOGRAM,
  },
  {
    value: 'sli.apm.transactionDuration',
    text: INDICATOR_APM_LATENCY,
  },
  {
    value: 'sli.apm.transactionErrorRate',
    text: INDICATOR_APM_AVAILABILITY,
  },
];
