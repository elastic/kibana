/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { GetDrilldownsSchemaFnType } from '@kbn/embeddable-plugin/server';
import {
  serializedTimeRangeSchema,
  serializedTitlesSchema,
} from '@kbn/presentation-publishing-schemas';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';

export const serviceMapCustomStateSchema = schema.object({
  environment: schema.string({ defaultValue: ENVIRONMENT_ALL.value }),
  kuery: schema.maybe(schema.string()),
  service_name: schema.maybe(schema.string()),
  service_group_id: schema.maybe(schema.string()),
});

export type ServiceMapCustomState = TypeOf<typeof serviceMapCustomStateSchema>;

export const getServiceMapEmbeddableSchema = (_getDrilldownsSchema: GetDrilldownsSchemaFnType) =>
  schema.allOf([serializedTitlesSchema, serializedTimeRangeSchema, serviceMapCustomStateSchema], {
    meta: {
      id: 'apm-service-map-embeddable',
      description: 'APM service map embeddable schema',
    },
  });

export type ServiceMapEmbeddableState = TypeOf<ReturnType<typeof getServiceMapEmbeddableSchema>>;
