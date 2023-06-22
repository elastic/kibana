/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { IEventLogClient } from '@kbn/event-log-plugin/server';
import type {
  PublicRuleResultService,
  PublicRuleMonitoringService,
  RulesClientApi,
} from '@kbn/alerting-plugin/server/types';

import type { IDetectionEngineHealthClient } from './detection_engine_health/detection_engine_health_client_interface';
import type { IRuleExecutionLogForRoutes } from './rule_execution_log/client_for_routes/client_interface';
import type {
  IRuleExecutionLogForExecutors,
  RuleExecutionContext,
} from './rule_execution_log/client_for_executors/client_interface';

export interface IRuleMonitoringService {
  registerEventLogProvider(): void;

  createDetectionEngineHealthClient(
    params: DetectionEngineHealthClientParams
  ): IDetectionEngineHealthClient;

  createRuleExecutionLogClientForRoutes(
    params: RuleExecutionLogClientForRoutesParams
  ): IRuleExecutionLogForRoutes;

  createRuleExecutionLogClientForExecutors(
    params: RuleExecutionLogClientForExecutorsParams
  ): Promise<IRuleExecutionLogForExecutors>;
}

export interface DetectionEngineHealthClientParams {
  savedObjectsClient: SavedObjectsClientContract;
  rulesClient: RulesClientApi;
  eventLogClient: IEventLogClient;
  currentSpaceId: string;
}

export interface RuleExecutionLogClientForRoutesParams {
  savedObjectsClient: SavedObjectsClientContract;
  eventLogClient: IEventLogClient;
}

export interface RuleExecutionLogClientForExecutorsParams {
  savedObjectsClient: SavedObjectsClientContract;
  ruleMonitoringService?: PublicRuleMonitoringService;
  ruleResultService?: PublicRuleResultService;
  context: RuleExecutionContext;
}
