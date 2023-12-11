/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';
import { MatrixHistogramQuery } from '../model/factory_query_type';
import { inspect } from '../model/inspect';
import { requestBasicOptionsSchema } from '../model/request_basic_options';
import { runtimeMappings } from '../model/runtime_mappings';
import { timerange } from '../model/timerange';

export enum MatrixHistogramType {
  authentications = 'authentications',
  anomalies = 'anomalies',
  events = 'events',
  alerts = 'alerts',
  dns = 'dns',
  preview = 'preview',
}

export const matrixHistogramSchema = requestBasicOptionsSchema.extend({
  histogramType: z.enum([
    MatrixHistogramType.alerts,
    MatrixHistogramType.anomalies,
    MatrixHistogramType.authentications,
    MatrixHistogramType.dns,
    MatrixHistogramType.events,
    MatrixHistogramType.preview,
  ]),
  stackByField: z.string().optional(),
  threshold: z
    .object({
      field: z.array(z.string()),
      value: z.string(),
      cardinality: z
        .object({
          field: z.array(z.string()),
          value: z.string(),
        })
        .optional(),
    })
    .optional(),
  inspect,
  isPtrIncluded: z.boolean().default(false),
  includeMissingData: z.boolean().default(true),
  runtimeMappings,
  timerange,
  factoryQueryType: z.literal(MatrixHistogramQuery),
});

export type MatrixHistogramRequestOptionsInput = z.input<typeof matrixHistogramSchema>;

export type MatrixHistogramRequestOptions = z.infer<typeof matrixHistogramSchema>;
