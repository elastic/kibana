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
export interface BaseTelemetryEvent {
  errorMessage?: string[] | string;
  error?: EventError[];
}

export interface PackageUpdateEvent extends BaseTelemetryEvent {
  packageName: string;
  currentVersion: string;
  newVersion: string;
  status: 'success' | 'failure';
  dryRun?: boolean;
  eventType: UpdateEventType;
  installType?: InstallType;
}

interface SharedIntegrations {
  name: string;
  pkgName: string;
  version?: string;
  sharedByPoliciesCount: number;
}
export interface IntegrationPoliciesEvent extends BaseTelemetryEvent {
  shared: {
    totalCount: number;
    integrations: SharedIntegrations[];
  };
}

export interface FleetTelemetryChannelEvents {
  // channel name => event type
  'fleet-upgrades': PackageUpdateEvent;
  'fleet-integrations': IntegrationPoliciesEvent;
}

export type FleetTelemetryChannel = keyof FleetTelemetryChannelEvents;
