/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ServiceLocationErrors } from '../../common/runtime_types/monitor_management';
import { MONITOR_ERROR_EVENTS_CHANNEL } from './constants';

export interface MonitorSyncEvent {
  total: number;
  totalTests: number;
  browserTests24h: number;
  httpTests24h: number;
  icmpTests24h: number;
  tcpTests24h: number;
  [key: string]: number;
}

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
  scriptType?: 'inline' | 'recorder' | 'zip' | 'project';
  revision?: number;
  errors?: ServiceLocationErrors;
  configId: string;
}

export interface MonitorErrorEvent {
  type: string;
  message: string;
  reason?: string;
  code?: string;
  status?: number;
  url?: string;
  stackVersion: string;
}

export interface MonitorUpdateTelemetryChannelEvents {
  // channel name => event type
  'synthetics-monitor-update': MonitorUpdateEvent;
  'synthetics-monitor-current': MonitorUpdateEvent;
  [MONITOR_ERROR_EVENTS_CHANNEL]: MonitorErrorEvent;
  'synthetics-monitor-sync-state': MonitorSyncEvent;
  'synthetics-monitor-sync-events': MonitorSyncEvent;
}

export type MonitorUpdateTelemetryChannel = keyof MonitorUpdateTelemetryChannelEvents;
