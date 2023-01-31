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
} from '@kbn/alerting-plugin/server/types';
import type { IRuleExecutionLogForRoutes } from './client_for_routes/client_interface';
import type {
  IRuleExecutionLogForExecutors,
  RuleExecutionContext,
} from './client_for_executors/client_interface';

export interface IRuleExecutionLogService {
  registerEventLogProvider(): void;

  createClientForRoutes(params: ClientForRoutesParams): IRuleExecutionLogForRoutes;

  createClientForExecutors(
    params: ClientForExecutorsParams
  ): Promise<IRuleExecutionLogForExecutors>;
}

export interface ClientForRoutesParams {
  savedObjectsClient: SavedObjectsClientContract;
  eventLogClient: IEventLogClient;
}

export interface ClientForExecutorsParams {
  savedObjectsClient: SavedObjectsClientContract;
  ruleMonitoringService?: PublicRuleMonitoringService;
  ruleResultService?: PublicRuleResultService;
  context: RuleExecutionContext;
}
