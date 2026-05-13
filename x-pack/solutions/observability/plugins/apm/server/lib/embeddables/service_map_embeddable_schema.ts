/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetDrilldownsSchemaFnType } from '@kbn/embeddable-plugin/server';
import { z } from '@kbn/zod';
import {
  serializedTimeRangeSchema,
  serializedTitlesSchema,
} from '@kbn/presentation-publishing-schemas';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';

export const serviceMapCustomStateSchema = z.object({
  environment: z.string().default(ENVIRONMENT_ALL.value),
  kuery: z.string().optional(),
  service_name: z.string().optional(),
  service_group_id: z.string().optional(),
});

export type ServiceMapCustomState = z.output<typeof serviceMapCustomStateSchema>;

export const getServiceMapEmbeddableSchema = (_getDrilldownsSchema: GetDrilldownsSchemaFnType) =>
  z
    .object({
      ...serializedTitlesSchema.shape,
      ...serializedTimeRangeSchema.shape,
      ...serviceMapCustomStateSchema.shape,
    })
    .meta({
      id: 'apm-service-map-embeddable',
      description: 'APM service map embeddable schema',
    });

export type ServiceMapEmbeddableState = z.output<ReturnType<typeof getServiceMapEmbeddableSchema>>;
