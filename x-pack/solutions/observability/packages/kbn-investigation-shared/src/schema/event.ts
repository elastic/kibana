/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

const eventTypeSchema = z.union([
  z.literal('annotation'),
  z.literal('alert'),
  z.literal('error_rate'),
  z.literal('latency'),
  z.literal('anomaly'),
]);

const sourceSchema = z.record(z.string(), z.any());

const annotationEventSchema = z.object({
  eventType: z.literal('annotation'),
  id: z.string(),
  title: z.string(),
  description: z.string(),
  timestamp: z.number(),
  source: sourceSchema.optional(),
  annotationType: z.string().optional(),
});

const alertStatusSchema = z.union([
  z.literal('active'),
  z.literal('flapping'),
  z.literal('recovered'),
  z.literal('untracked'),
]);

const alertEventSchema = z.object({
  eventType: z.literal('alert'),
  id: z.string(),
  title: z.string(),
  description: z.string(),
  timestamp: z.number(),
  source: sourceSchema.optional(),
  alertStatus: alertStatusSchema,
});

const eventSchema = z.discriminatedUnion('eventType', [annotationEventSchema, alertEventSchema]);

type EventResponse = z.output<typeof eventSchema>;
type AlertEventResponse = z.output<typeof alertEventSchema>;
type AnnotationEventResponse = z.output<typeof annotationEventSchema>;

export type { EventResponse, AlertEventResponse, AnnotationEventResponse };
export { eventSchema, eventTypeSchema, alertEventSchema, annotationEventSchema };
