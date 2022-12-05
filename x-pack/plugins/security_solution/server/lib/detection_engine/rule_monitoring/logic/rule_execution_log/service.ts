/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ConfigType } from '../../../../../config';
import { withSecuritySpan } from '../../../../../utils/with_security_span';
import type {
  SecuritySolutionPluginCoreSetupDependencies,
  SecuritySolutionPluginSetupDependencies,
} from '../../../../../plugin_contract';

import type { IRuleExecutionLogForRoutes } from './client_for_routes/client_interface';
import { createClientForRoutes } from './client_for_routes/client';
import type { IRuleExecutionLogForExecutors } from './client_for_executors/client_interface';
import { createClientForExecutors } from './client_for_executors/client';

import { registerEventLogProvider } from './event_log/register_event_log_provider';
import { createEventLogReader } from './event_log/event_log_reader';
import { createEventLogWriter } from './event_log/event_log_writer';
import { createRuleExecutionSavedObjectsClient } from './execution_saved_object/saved_objects_client';
import { fetchRuleExecutionSettings } from './execution_settings/fetch_rule_execution_settings';
import type {
  ClientForExecutorsParams,
  ClientForRoutesParams,
  IRuleExecutionLogService,
} from './service_interface';

export const createRuleExecutionLogService = (
  config: ConfigType,
  logger: Logger,
  core: SecuritySolutionPluginCoreSetupDependencies,
  plugins: SecuritySolutionPluginSetupDependencies
): IRuleExecutionLogService => {
  return {
    registerEventLogProvider: () => {
      registerEventLogProvider(plugins.eventLog);
    },

    createClientForRoutes: (params: ClientForRoutesParams): IRuleExecutionLogForRoutes => {
      const { savedObjectsClient, eventLogClient } = params;

      const soClient = createRuleExecutionSavedObjectsClient(savedObjectsClient, logger);
      const eventLogReader = createEventLogReader(eventLogClient);

      return createClientForRoutes(soClient, eventLogReader, logger);
    },

    createClientForExecutors: (
      params: ClientForExecutorsParams
    ): Promise<IRuleExecutionLogForExecutors> => {
      return withSecuritySpan('IRuleExecutionLogService.createClientForExecutors', async () => {
        const { savedObjectsClient, context, ruleMonitoringService } = params;

        const childLogger = logger.get('ruleExecution');

        const ruleExecutionSettings = await fetchRuleExecutionSettings(
          config,
          childLogger,
          core,
          savedObjectsClient
        );

        const soClient = createRuleExecutionSavedObjectsClient(savedObjectsClient, childLogger);
        const eventLogWriter = createEventLogWriter(plugins.eventLog);

        return createClientForExecutors(
          ruleExecutionSettings,
          soClient,
          eventLogWriter,
          childLogger,
          context,
          ruleMonitoringService
        );
      });
    },
  };
};
