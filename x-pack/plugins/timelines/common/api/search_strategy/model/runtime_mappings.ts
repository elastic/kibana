/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

export type MappingRuntimeFieldType =
  | 'boolean'
  | 'date'
  | 'double'
  | 'geo_point'
  | 'ip'
  | 'keyword'
  | 'long'
  | 'lookup';

export const runtimeMappings = z.record(
  z.object({
    type: z.union([
      z.literal('boolean'),
      z.literal('date'),
      z.literal('double'),
      z.literal('geo_point'),
      z.literal('ip'),
      z.literal('keyword'),
      z.literal('long'),
      z.literal('lookup'),
    ]),
    script: z.string(),
  })
);
