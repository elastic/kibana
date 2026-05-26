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
  errorRate: z.number().min(0).max(1).optional(),
  throughputRpm: z.number().optional(),
});

export const apmMetricsAttachmentDataSchema = z.object({
  serviceName: z.string(),
  environment: z.string().optional(),
  current: metricSnapshotSchema,
  baseline: metricSnapshotSchema.optional(),
  timeRange: z.object({
    from: z.string(),
    to: z.string(),
  }),
  title: z.string().optional(),
});

export type ApmMetricsAttachmentData = z.infer<typeof apmMetricsAttachmentDataSchema>;
