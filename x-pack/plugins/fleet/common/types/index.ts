/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from './models';
export * from './rest_spec';

import type {
  PreconfiguredAgentPolicy,
  PreconfiguredPackage,
  PreconfiguredOutput,
} from './models/preconfiguration';

export interface FleetConfigType {
  enabled: boolean;
  registryUrl?: string;
  registryProxyUrl?: string;
  agents: {
    enabled: boolean;
    elasticsearch: {
      hosts?: string[];
      ca_sha256?: string;
    };
    fleet_server?: {
      hosts?: string[];
    };
  };
  agentPolicies?: PreconfiguredAgentPolicy[];
  packages?: PreconfiguredPackage[];
  outputs?: PreconfiguredOutput[];
  agentIdVerificationEnabled?: boolean;
  developer?: {
    disableRegistryVersionCheck?: boolean;
    allowAgentUpgradeSourceUri?: boolean;
    bundledPackageLocation?: string;
  };
}

// Calling Object.entries(PackagesGroupedByStatus) gave `status: string`
// which causes a "string is not assignable to type InstallationStatus` error
// see https://github.com/Microsoft/TypeScript/issues/20322
// and https://github.com/Microsoft/TypeScript/pull/12253#issuecomment-263132208
// and https://github.com/Microsoft/TypeScript/issues/21826#issuecomment-479851685
export const entries = Object.entries as <T>(o: T) => Array<[keyof T, T[keyof T]]>;

/**
 * Creates a Union Type for all the values of an object
 */
export type ValueOf<T> = T[keyof T];
