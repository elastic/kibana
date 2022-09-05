/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AnalyticsCollection {
  id: string;
  name: string;
  event_retention_day_length: number;
}

export type AnalyticsCollectionDocument = Omit<AnalyticsCollection, 'id'>;
