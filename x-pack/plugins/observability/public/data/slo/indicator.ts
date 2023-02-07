/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLOWithSummaryResponse } from '@kbn/slo-schema';

export const buildApmAvailabilityIndicator = (
  params: Partial<SLOWithSummaryResponse['indicator']['params']> = {}
): SLOWithSummaryResponse['indicator'] => {
  return {
    type: 'sli.apm.transactionErrorRate',
    params: {
      environment: 'development',
      service: 'o11y-app',
      transactionType: 'request',
      transactionName: 'GET /flaky',
      goodStatusCodes: ['2xx', '3xx', '4xx'],
      ...params,
    },
  };
};

export const buildApmLatencyIndicator = (
  params: Partial<SLOWithSummaryResponse['indicator']['params']> = {}
): SLOWithSummaryResponse['indicator'] => {
  return {
    type: 'sli.apm.transactionDuration',
    params: {
      environment: 'development',
      service: 'o11y-app',
      transactionType: 'request',
      transactionName: 'GET /slow',
      'threshold.us': 5000000,
      ...params,
    },
  };
};

export const buildCustomKqlIndicator = (
  params: Partial<SLOWithSummaryResponse['indicator']['params']> = {}
): SLOWithSummaryResponse['indicator'] => {
  return {
    type: 'sli.kql.custom',
    params: {
      index: 'some_logs*',
      good: 'latency < 300',
      total: 'latency > 0',
      filter: 'labels.eventId: event-0',
      ...params,
    },
  };
};
