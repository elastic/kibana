/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface LensTelemetryState {
  runs: number;
  byDate: Record<string, Record<string, number>>;
  suggestionsByDate: Record<string, Record<string, number>>;
  saved: LensVisualizationUsage;
}

export interface LensVisualizationUsage {
  saved_overall: Record<string, number>;
  saved_30_days: Record<string, number>;
  saved_90_days: Record<string, number>;
  saved_overall_total: number;
  saved_30_days_total: number;
  saved_90_days_total: number;
}

export interface LensClickUsage {
  events_30_days: Record<string, number>;
  events_90_days: Record<string, number>;
  suggestion_events_30_days: Record<string, number>;
  suggestion_events_90_days: Record<string, number>;
}

export type LensUsage = LensVisualizationUsage & LensClickUsage;
