/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AnalyticsCollection {
  event_retention_day_length: number;
  events_datastream: string;
  id: string;
  name: string;
}

export type AnalyticsCollectionDocument = Omit<AnalyticsCollection, 'id'>;

export interface AnalyticsEventsIndexExists {
  exists: boolean;
}
