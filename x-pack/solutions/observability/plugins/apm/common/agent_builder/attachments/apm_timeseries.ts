/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const APM_TIMESERIES_ATTACHMENT_TYPE = 'observability.apm-timeseries' as const;

export const apmTimeseriesAttachmentDataSchema = z.object({
  serviceName: z.string(),
  metric: z.enum(['latency', 'failedTransactionRate', 'throughput']),
  unit: z.enum(['ms', '%', 'rpm']),
  dataPoints: z.array(
    z.object({
      timestamp: z.number(),
      value: z.number().nullable(),
    })
  ),
  alertThreshold: z.number().optional(),
  alertStart: z.number().optional(),
  title: z.string().optional(),
});

export type ApmTimeseriesAttachmentData = z.infer<typeof apmTimeseriesAttachmentDataSchema>;
