/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type, TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
// `@kbn/presentation-publishing-schemas` is a server package; `common/` may only use its types.
import type { SerializedTimeRange, SerializedTitles } from '@kbn/presentation-publishing-schemas';
import { ENVIRONMENT_ALL } from '../environment_filter_values';

// Single source of truth: schema validation and edit-flyout combobox options derive from the same arrays.
export const ALERT_STATUS_VALUES = ['active', 'recovered', 'untracked', 'delayed'] as const;
export const SLO_STATUS_VALUES = ['healthy', 'degrading', 'violated', 'noData'] as const;
export const CONNECTION_VALUES = ['orphaned', 'connected'] as const;
export const ANOMALY_SEVERITY_VALUES = [
  'critical',
  'major',
  'minor',
  'warning',
  'low',
  'unknown',
] as const;
export const MAP_ORIENTATION_VALUES = ['horizontal', 'vertical'] as const;

export type AlertStatusValue = (typeof ALERT_STATUS_VALUES)[number];
export type SloStatusValue = (typeof SLO_STATUS_VALUES)[number];
export type ConnectionValue = (typeof CONNECTION_VALUES)[number];
export type AnomalySeverityValue = (typeof ANOMALY_SEVERITY_VALUES)[number];
export type MapOrientationValue = (typeof MAP_ORIENTATION_VALUES)[number];

// `schema.oneOf` expects a fixed-arity tuple; cast to satisfy types while passing the full array.
function literalsOf<T extends string>(values: readonly T[]): Type<T> {
  const literals = values.map((value) => schema.literal(value));
  return schema.oneOf(literals as unknown as [Type<T>]);
}

export const serviceMapCustomStateSchema = schema.object({
  environment: schema.string({ defaultValue: ENVIRONMENT_ALL.value, maxLength: 1024 }),
  kuery: schema.maybe(schema.string({ maxLength: 2048 })),
  service_name: schema.maybe(schema.string({ maxLength: 1024 })),
  service_group_id: schema.maybe(schema.string({ maxLength: 1024 })),
  map_orientation: schema.maybe(literalsOf(MAP_ORIENTATION_VALUES)),
  sync_with_dashboard_filters: schema.maybe(schema.boolean()),
  alert_status_filter: schema.maybe(
    schema.arrayOf(literalsOf(ALERT_STATUS_VALUES), { maxSize: ALERT_STATUS_VALUES.length })
  ),
  slo_status_filter: schema.maybe(
    schema.arrayOf(literalsOf(SLO_STATUS_VALUES), { maxSize: SLO_STATUS_VALUES.length })
  ),
  connection_filter: schema.maybe(
    schema.arrayOf(literalsOf(CONNECTION_VALUES), { maxSize: CONNECTION_VALUES.length })
  ),
  anomaly_severity_filter: schema.maybe(
    schema.arrayOf(literalsOf(ANOMALY_SEVERITY_VALUES), {
      maxSize: ANOMALY_SEVERITY_VALUES.length,
    })
  ),
});

export type ServiceMapCustomState = TypeOf<typeof serviceMapCustomStateSchema>;

export type ServiceMapEmbeddableState = SerializedTitles &
  SerializedTimeRange &
  ServiceMapCustomState;
