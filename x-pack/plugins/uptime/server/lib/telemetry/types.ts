/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface MonitorUpdateEvent {
  updatedAt?: string;
  lastUpdatedAt?: string;
  durationSinceLastUpdated?: number;
  deletedAt?: string;
  type: string;
  stackVersion: string;
  monitorNameLength: number;
  monitorInterval: number;
  locations: string[];
  locationsCount: number;
  scriptType?: 'inline' | 'recorder' | 'zip';
  revision: number;
  error?: Array<{ locationId: string; error: Error }>;
  configId: string;
}

export interface MonitorUpdateTelemetryChannelEvents {
  // channel name => event type
  'synthetics-monitor-update': MonitorUpdateEvent;
}

export type MonitorUpdateTelemetryChannel = keyof MonitorUpdateTelemetryChannelEvents;
