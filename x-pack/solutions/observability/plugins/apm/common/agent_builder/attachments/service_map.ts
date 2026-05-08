/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const SERVICE_MAP_ATTACHMENT_TYPE = 'observability.service-map' as const;

const serviceNodeSchema = z.object({
  'service.name': z.string(),
  'agent.name': z.string().optional(),
});

const externalNodeSchema = z.object({
  'span.destination.service.resource': z.string(),
  'span.type': z.string(),
  'span.subtype': z.string(),
});

const nodeSchema = z.union([serviceNodeSchema, externalNodeSchema]);

const connectionMetricsSchema = z
  .object({
    errorRate: z.number().optional(),
    latencyMs: z.number().optional(),
    throughputPerMin: z.number().optional(),
  })
  .optional();

const connectionSchema = z.object({
  source: nodeSchema,
  target: nodeSchema,
  metrics: connectionMetricsSchema,
});

export const serviceMapAttachmentDataSchema = z.object({
  connections: z.array(connectionSchema),
  serviceName: z.string().optional(),
  title: z.string().optional(),
});

export type ServiceMapAttachmentData = z.infer<typeof serviceMapAttachmentDataSchema>;
