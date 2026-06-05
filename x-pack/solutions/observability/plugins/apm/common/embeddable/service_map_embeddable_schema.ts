/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type, TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
// Type-only: `@kbn/presentation-publishing-schemas` is a server package, so `common/` may reference
// its types but not its runtime schemas. The runtime `allOf` (titles + time range) is assembled
// server-side in `register_service_map_embeddable_transforms.ts`.
import type { SerializedTimeRange, SerializedTitles } from '@kbn/presentation-publishing-schemas';
import { ENVIRONMENT_ALL } from '../environment_filter_values';

/**
 * Single source of truth for the allowed view-filter values. The embeddable schema
 * (runtime validation) and the edit-flyout combobox options (UI) both derive from these
 * arrays, so a value can't pass one and fail the other (review #14).
 */
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

/**
 * Build a `oneOf` of string literals from a readonly values array, preserving the literal union as
 * the schema's value type. `schema.oneOf` is typed for fixed-arity tuples, so we present the
 * runtime array as a single-element tuple (it accepts the whole array at runtime) and annotate the
 * return as `Type<T>` to keep `T` instead of collapsing to `unknown`.
 */
function literalsOf<T extends string>(values: readonly T[]): Type<T> {
  const literals = values.map((value) => schema.literal(value));
  return schema.oneOf(literals as unknown as [Type<T>]);
}

export const serviceMapCustomStateSchema = schema.object({
  environment: schema.string({ defaultValue: ENVIRONMENT_ALL.value }),
  kuery: schema.maybe(schema.string()),
  service_name: schema.maybe(schema.string()),
  service_group_id: schema.maybe(schema.string()),
  map_orientation: schema.maybe(literalsOf(MAP_ORIENTATION_VALUES)),
  // True = panel follows the dashboard's global filters / KQL / Controls. False (default)
  // = panel uses only its own captured filters. Time-range customization is separate:
  // handled by Kibana's built-in "Customize time range" panel-menu action, which writes
  // `time_range` here — presence of `time_range` is the implicit toggle (set → panel uses
  // its own; absent → panel inherits the dashboard's global time via fetch$ fallback).
  sync_with_dashboard_filters: schema.maybe(schema.boolean()),
  // `maxSize` on each filter array is bounded by the number of distinct (closed-enum) options
  // the UI offers, keeping the schema safe against unbounded input.
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

// Mirrors the server-side `schema.allOf([serializedTitlesSchema, serializedTimeRangeSchema,
// serviceMapCustomStateSchema])` registration, expressed as a type so client code can consume it
// without importing the server schema package.
export type ServiceMapEmbeddableState = SerializedTitles &
  SerializedTimeRange &
  ServiceMapCustomState;
