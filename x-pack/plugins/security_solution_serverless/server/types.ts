/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup, ElasticsearchClient, Logger, LoggerFactory } from '@kbn/core/server';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import type { PluginSetupContract, PluginStartContract } from '@kbn/features-plugin/server';
import type {
  PluginSetup as SecuritySolutionPluginSetup,
  PluginStart as SecuritySolutionPluginStart,
} from '@kbn/security-solution-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { SecuritySolutionEssPluginSetup } from '@kbn/security-solution-ess/server';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import type { FleetStartContract } from '@kbn/fleet-plugin/server';

import type { ProductTier } from '../common/product';

import type { ServerlessSecurityConfig } from './config';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SecuritySolutionServerlessPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SecuritySolutionServerlessPluginStart {}

export interface SecuritySolutionServerlessPluginSetupDeps {
  security: SecurityPluginSetup;
  securitySolution: SecuritySolutionPluginSetup;
  securitySolutionEss: SecuritySolutionEssPluginSetup;
  features: PluginSetupContract;
  ml: MlPluginSetup;
  taskManager: TaskManagerSetupContract;
  cloudSetup: CloudSetup;
}

export interface SecuritySolutionServerlessPluginStartDeps {
  security: SecurityPluginStart;
  securitySolution: SecuritySolutionPluginStart;
  features: PluginStartContract;
  taskManager: TaskManagerStartContract;
  fleet: FleetStartContract;
}

export interface UsageRecord {
  id: string;
  usage_timestamp: string;
  creation_timestamp: string;
  usage: UsageMetrics;
  source: UsageSource;
}

export interface UsageMetrics {
  type: string;
  sub_type?: string;
  quantity: number;
  period_seconds?: number;
  cause?: string;
  metadata?: unknown;
}

export interface UsageSource {
  id: string;
  instance_group_id: string;
  metadata?: UsageSourceMetadata;
}

export interface UsageSourceMetadata {
  tier?: ProductTier;
}

export interface SecurityUsageReportingTaskSetupContract {
  core: CoreSetup;
  logFactory: LoggerFactory;
  config: ServerlessSecurityConfig;
  taskManager: TaskManagerSetupContract;
  cloudSetup: CloudSetup;
  taskType: string;
  taskTitle: string;
  version: string;
  meteringCallback: MeteringCallback;
}

export interface SecurityUsageReportingTaskStartContract {
  taskManager: TaskManagerStartContract;
  interval: string;
}

export type MeteringCallback = (
  metringCallbackInput: MeteringCallbackInput
) => Promise<UsageRecord[]>;

export interface MeteringCallbackInput {
  esClient: ElasticsearchClient;
  cloudSetup: CloudSetup;
  logger: Logger;
  taskId: string;
  lastSuccessfulReport: Date;
  abortController: AbortController;
  config: ServerlessSecurityConfig;
}

export interface MetringTaskProperties {
  taskType: string;
  taskTitle: string;
  meteringCallback: MeteringCallback;
  interval: string;
  periodSeconds: number;
  version: string;
}
