/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackagePolicy, AgentPolicy } from '@kbn/fleet-plugin/common';

export type IndexStatus =
  | 'not-empty' // Index contains documents
  | 'empty' // Index doesn't contain documents (or doesn't exist)
  | 'unprivileged'; // User doesn't have access to query the index

export type CloudDefendStatusCode =
  | 'indexed' // alerts index exists and has results
  | 'indexing' // index timeout was not surpassed since installation, assumes data is being indexed
  | 'unprivileged' // user lacks privileges for the alerts index
  | 'index-timeout' // index timeout was surpassed since installation
  | 'not-deployed' // no healthy agents were deployed
  | 'not-installed'; // number of installed integrations is 0;

export interface IndexDetails {
  index: string;
  status: IndexStatus;
}

interface BaseCloudDefendSetupStatus {
  indicesDetails: IndexDetails[];
  latestPackageVersion: string;
  installedPackagePolicies: number;
  healthyAgents: number;
}

interface CloudDefendSetupNotInstalledStatus extends BaseCloudDefendSetupStatus {
  status: Extract<CloudDefendStatusCode, 'not-installed'>;
}

interface CloudDefendSetupInstalledStatus extends BaseCloudDefendSetupStatus {
  status: Exclude<CloudDefendStatusCode, 'not-installed'>;
  // status can be `indexed` but return with undefined package information in this case
  installedPackageVersion: string | undefined;
}

export type CloudDefendSetupStatus =
  | CloudDefendSetupInstalledStatus
  | CloudDefendSetupNotInstalledStatus;

export type AgentPolicyStatus = Pick<AgentPolicy, 'id' | 'name'> & { agents: number };

export interface CloudDefendPolicy {
  package_policy: PackagePolicy;
  agent_policy: AgentPolicyStatus;
}
