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
  map_orientation: schema.maybe(
    schema.oneOf([schema.literal('horizontal'), schema.literal('vertical')])
  ),
  // True (default) = panel uses only its own captured filters and ignores the
  // dashboard's KQL/Controls. False = panel responds to dashboard filters too.
  apply_custom_filters: schema.maybe(schema.boolean()),
  // True = panel uses its own `time_range`. False (default) = panel inherits the
  // dashboard's global time range (via fetch$ fallback when timeRange$ emits undefined).
  apply_custom_time_range: schema.maybe(schema.boolean()),
  alert_status_filter: schema.maybe(
    schema.arrayOf(
      schema.oneOf([
        schema.literal('active'),
        schema.literal('recovered'),
        schema.literal('untracked'),
        schema.literal('delayed'),
      ])
    )
  ),
  slo_status_filter: schema.maybe(
    schema.arrayOf(
      schema.oneOf([
        schema.literal('healthy'),
        schema.literal('degrading'),
        schema.literal('violated'),
        schema.literal('noData'),
      ])
    )
  ),
  connection_filter: schema.maybe(
    schema.arrayOf(schema.oneOf([schema.literal('orphaned'), schema.literal('connected')]))
  ),
  anomaly_severity_filter: schema.maybe(
    schema.arrayOf(
      schema.oneOf([
        schema.literal('critical'),
        schema.literal('major'),
        schema.literal('minor'),
        schema.literal('warning'),
        schema.literal('low'),
        schema.literal('unknown'),
      ])
    )
  ),
  find_query: schema.maybe(schema.string()),
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
