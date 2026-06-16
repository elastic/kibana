/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const APM_METRICS_ATTACHMENT_TYPE = 'observability.apm-metrics' as const;

const metricSnapshotSchema = z.object({
  latencyMs: z.number().optional(),
  /**
   * Error rate as a percentage in the range 0–100.
   * Example: `8.0` means 8% error rate.
   * Consistent with the `apm_timeseries` attachment's `'%'` unit convention.
   */
  errorRate: z.number().optional(),
  throughputRpm: z.number().optional(),
});

export const apmMetricsAttachmentDataSchema = z.object({
  serviceName: z.string(),
  environment: z.string().optional(),
  title: z.string().optional(),
  current: metricSnapshotSchema,
  baseline: metricSnapshotSchema.optional(),
});

export type MetricSnapshot = z.infer<typeof metricSnapshotSchema>;
export type ApmMetricsAttachmentData = z.infer<typeof apmMetricsAttachmentDataSchema>;
