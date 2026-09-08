/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ApiClientConfig {
  kibanaUrl: string;
  username: string;
  password: string;
}

export interface PrivateLocation {
  id: string;
  label: string;
  agentPolicyId: string;
  geo: { lat: number; lon: number };
}

export interface AgentPolicy {
  id: string;
  name: string;
}

export interface Space {
  id: string;
  name: string;
}

export interface MonitorLocation {
  id: string;
  isServiceManaged: boolean;
}

export interface Monitor {
  id: string;
  name: string;
  type: string;
  config_id: string;
  tags?: string[];
  locations?: MonitorLocation[];
}

export interface MonitorCounts {
  http: number;
  tcp: number;
  icmp: number;
  browser: number;
}

export interface ForgeConfig {
  kibanaUrl: string;
  username: string;
  password: string;
  spaceId: string;
  monitorCounts: MonitorCounts;
  concurrency: number;
  resourcePrefix: string;
  /** Optional: Use existing private location instead of creating new one */
  privateLocationId?: string;
}

export interface ForgeOutput {
  spaceId: string;
  agentPolicyId: string;
  agentPolicyName: string;
  privateLocationId: string;
  privateLocationLabel: string;
  enrollmentToken: string;
  kibanaVersion: string;
  monitorIds: string[];
  monitorCount: number;
  kibanaUrl: string;
}

export interface CleanupResult {
  monitorsDeleted: number;
  packagePoliciesDeleted: number;
  privateLocationsDeleted: number;
  agentsUnenrolled: number;
  agentPoliciesDeleted: number;
}
