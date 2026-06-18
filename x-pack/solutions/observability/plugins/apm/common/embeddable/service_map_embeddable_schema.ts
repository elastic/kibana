/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
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

export const serviceMapCustomStateSchema = z
  .object({
    environment: z.string().max(1024).default(ENVIRONMENT_ALL.value),
    kuery: z.string().max(2048).optional(),
    service_name: z.string().max(1024).optional(),
    service_group_id: z.string().max(1024).optional(),
    map_orientation: z.enum(MAP_ORIENTATION_VALUES).optional(),
    sync_with_dashboard_filters: z.boolean().optional(),
    alert_status_filter: z
      .array(z.enum(ALERT_STATUS_VALUES))
      .max(ALERT_STATUS_VALUES.length)
      .optional(),
    slo_status_filter: z.array(z.enum(SLO_STATUS_VALUES)).max(SLO_STATUS_VALUES.length).optional(),
    connection_filter: z.array(z.enum(CONNECTION_VALUES)).max(CONNECTION_VALUES.length).optional(),
    anomaly_severity_filter: z
      .array(z.enum(ANOMALY_SEVERITY_VALUES))
      .max(ANOMALY_SEVERITY_VALUES.length)
      .optional(),
  })
  .strict();

export type ServiceMapCustomState = z.output<typeof serviceMapCustomStateSchema>;

export type ServiceMapEmbeddableState = SerializedTitles &
  SerializedTimeRange &
  ServiceMapCustomState;
