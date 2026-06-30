/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

// snake_case field names match the addOptionsListControl API shape.
export interface ServiceMapControlConfig {
  field_name: string;
  title: string;
  width: 'small' | 'medium' | 'large';
  grow: boolean;
  /**
   * When `true`, the underlying options list control allows only one selected
   * value at a time. Defaults to `false` (multi-select).
   */
  single_select?: boolean;
}

/**
 * Control panel configuration for the service map Controls API dropdown filters.
 * The order of entries determines the visual order of the controls.
 */
export const SERVICE_MAP_CONTROLS_CONFIG: ServiceMapControlConfig[] = [
  {
    field_name: 'service.environment',
    title: i18n.translate('xpack.apm.serviceMap.controls.environment', {
      defaultMessage: 'Environment',
    }),
    width: 'small',
    grow: true,
    // APM uses a single-value `?environment=` URL param everywhere else, so the
    // service map env filter must also be single-select to stay consistent and
    // round-trip correctly through the URL.
    single_select: true,
  },
  {
    field_name: 'service.name',
    title: i18n.translate('xpack.apm.serviceMap.controls.serviceName', {
      defaultMessage: 'Service name',
    }),
    width: 'small',
    grow: true,
  },
  {
    field_name: 'cloud.region',
    title: i18n.translate('xpack.apm.serviceMap.controls.cloudRegion', {
      defaultMessage: 'Cloud region',
    }),
    width: 'small',
    grow: true,
  },
  {
    field_name: 'cloud.availability_zone',
    title: i18n.translate('xpack.apm.serviceMap.controls.cloudAvailabilityZone', {
      defaultMessage: 'Cloud availability zone',
    }),
    width: 'small',
    grow: true,
  },
];
