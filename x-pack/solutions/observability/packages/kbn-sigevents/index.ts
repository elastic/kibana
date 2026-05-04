/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from './components';

export { useFetchLatestSignificantEvent } from './hooks/use_fetch_latest_significant_event';
export type { LatestSignificantEventData } from './hooks/use_fetch_latest_significant_event';

export { useFetchSystemOverview } from './hooks/use_fetch_system_overview';
export type {
  SystemOverviewData,
  SigEventPriority,
  PriorityCounts,
} from './hooks/use_fetch_system_overview';
