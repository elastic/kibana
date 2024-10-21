/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export const metricNameSchema = z
  .string()
  .length(1)
  .regex(/[a-zA-Z]/)
  .toUpperCase();

const apiMetricSchema = z.object({
  name: z.string(),
  metrics: z.array(
    z.object({
      name: metricNameSchema,
      path: z.string(),
    })
  ),
  equation: z.string(),
});

const metaDataSchemaObj = z.object({
  source: z.string(),
  destination: z.string(),
  fromRoot: z.boolean().default(false),
  expand: z.optional(
    z.object({
      regex: z.string(),
      map: z.array(z.string()),
    })
  ),
});

type MetadataSchema = z.infer<typeof metaDataSchemaObj>;

const metadataSchema = metaDataSchemaObj
  .or(
    z.string().transform(
      (value) =>
        ({
          source: value,
          destination: value,
          fromRoot: false,
        } as MetadataSchema)
    )
  )
  .transform((metadata) => ({
    ...metadata,
    destination: metadata.destination ?? metadata.source,
  }))
  .superRefine((value, ctx) => {
    if (value.source.length === 0) {
      ctx.addIssue({
        path: ['source'],
        code: z.ZodIssueCode.custom,
        message: 'source should not be empty',
      });
    }
    if (value.destination.length === 0) {
      ctx.addIssue({
        path: ['destination'],
        code: z.ZodIssueCode.custom,
        message: 'destination should not be empty',
      });
    }
  });

export const apiScraperDefinitionSchema = z.object({
  id: z.string().regex(/^[\w-]+$/),
  name: z.string(),
  identityFields: z.array(z.string()),
  metadata: z.array(metadataSchema),
  metrics: z.array(apiMetricSchema),
  source: z.object({
    type: z.literal('elasticsearch_api'),
    endpoint: z.string(),
    method: z.enum(['GET', 'POST']),
    params: z.object({
      body: z.record(z.string(), z.any()),
      query: z.record(z.string(), z.any()),
    }),
    collect: z.object({
      path: z.string(),
      keyed: z.boolean().default(false),
    }),
  }),
  managed: z.boolean().default(false),
  apiKeyId: z.optional(z.string()),
});

export type ApiScraperDefinition = z.infer<typeof apiScraperDefinitionSchema>;

/**
 * Example of a "root" StreamEntity
 * {
 *   "id": "logs-all",
 *   "type": "logs",
 *   "dataset": "all",
 * }
 *
 * Example of a forked StreamEntity
 * {
 *    "id": "logs-nginx",
 *    "type": "logs",
 *    "dataset": "nginx",
 *    "forked_from": "logs-all"
 * }
 */

export const streamEntityDefinitonSchema = z.object({
  id: z.string(),
  type: z.enum(['logs', 'metrics']),
  dataset: z.string(),
  forked_from: z.optional(z.string()),
  condition: z.optional(z.string()),
});

export type StreamEntityDefinition = z.infer<typeof streamEntityDefinitonSchema>;
