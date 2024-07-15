/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InstallType } from '../types';

export enum UpdateEventType {
  PACKAGE_POLICY_UPGRADE = 'package-policy-upgrade',
  PACKAGE_INSTALL = 'package-install',
}

export interface EventError {
  key?: string;
  message: string | string[];
}
export interface TelemetryEvent {
  errorMessage?: string[] | string;
  error?: EventError[];
}

export interface PackageUpdateEvent extends TelemetryEvent {
  packageName: string;
  currentVersion: string;
  newVersion: string;
  status: 'success' | 'failure';
  dryRun?: boolean;
  eventType: UpdateEventType;
  installType?: InstallType;
}

export interface IntegrationPoliciesEvent extends TelemetryEvent {
  shared: {
    count: number;
    integrations: {
      name: string;
      pkgName: string;
      version?: string;
      shared_by_policies_count: number;
    };
  };
}

export interface FleetTelemetryChannelEvents {
  // channel name => event type
  'fleet-upgrades': PackageUpdateEvent;
  'fleet-integration-policies': IntegrationPoliciesEvent;
}

export type FleetTelemetryChannel = keyof FleetTelemetryChannelEvents;
