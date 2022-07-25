/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CHART_TYPE = {
  EVENT_DISTRIBUTION: 'event_distribution',
  POPULATION_DISTRIBUTION: 'population_distribution',
  SINGLE_METRIC: 'single_metric',
  GEO_MAP: 'geo_map',
} as const;

export type ChartType = typeof CHART_TYPE[keyof typeof CHART_TYPE];
