/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { invariant } from '../../../../../common/utils/invariant';
import type { ConfigType } from '../../../../config';
import { withSecuritySpan } from '../../../../utils/with_security_span';
import type {
  SecuritySolutionPluginCoreSetupDependencies,
  SecuritySolutionPluginSetupDependencies,
} from '../../../../plugin_contract';

import type { IDetectionEngineHealthClient } from './detection_engine_health/detection_engine_health_client_interface';
import type { IRuleExecutionLogForRoutes } from './rule_execution_log/client_for_routes/client_interface';
import { createRuleExecutionLogClientForRoutes } from './rule_execution_log/client_for_routes/client';
import type { IRuleExecutionLogForExecutors } from './rule_execution_log/client_for_executors/client_interface';
import { createRuleExecutionLogClientForExecutors } from './rule_execution_log/client_for_executors/client';

import { registerEventLogProvider } from './event_log/register_event_log_provider';
import { createDetectionEngineHealthClient } from './detection_engine_health/detection_engine_health_client';
import { createEventLogHealthClient } from './detection_engine_health/event_log/event_log_health_client';
import { createRuleObjectsHealthClient } from './detection_engine_health/rule_objects/rule_objects_health_client';
import { createEventLogReader } from './rule_execution_log/event_log/event_log_reader';
import { createEventLogWriter } from './rule_execution_log/event_log/event_log_writer';
import { fetchRuleExecutionSettings } from './rule_execution_log/execution_settings/fetch_rule_execution_settings';
import type {
  RuleExecutionLogClientForExecutorsParams,
  RuleExecutionLogClientForRoutesParams,
  IRuleMonitoringService,
  DetectionEngineHealthClientParams,
} from './service_interface';

export const createRuleMonitoringService = (
  config: ConfigType,
  logger: Logger,
  core: SecuritySolutionPluginCoreSetupDependencies,
  plugins: SecuritySolutionPluginSetupDependencies
): IRuleMonitoringService => {
  return {
    registerEventLogProvider: () => {
      registerEventLogProvider(plugins.eventLog);
    },

    createDetectionEngineHealthClient: (
      params: DetectionEngineHealthClientParams
    ): IDetectionEngineHealthClient => {
      const { rulesClient, eventLogClient, currentSpaceId } = params;
      const ruleObjectsHealthClient = createRuleObjectsHealthClient(rulesClient);
      const eventLogHealthClient = createEventLogHealthClient(eventLogClient);
      return createDetectionEngineHealthClient(
        ruleObjectsHealthClient,
        eventLogHealthClient,
        logger,
        currentSpaceId
      );
    },

    createRuleExecutionLogClientForRoutes: (
      params: RuleExecutionLogClientForRoutesParams
    ): IRuleExecutionLogForRoutes => {
      const { eventLogClient } = params;
      const eventLogReader = createEventLogReader(eventLogClient);
      return createRuleExecutionLogClientForRoutes(eventLogReader, logger);
    },

    createRuleExecutionLogClientForExecutors: (
      params: RuleExecutionLogClientForExecutorsParams
    ): Promise<IRuleExecutionLogForExecutors> => {
      return withSecuritySpan(
        'IRuleMonitoringService.createRuleExecutionLogClientForExecutors',
        async () => {
          const { savedObjectsClient, context, ruleMonitoringService, ruleResultService } = params;

          invariant(ruleMonitoringService, 'ruleMonitoringService required for detection rules');
          invariant(ruleResultService, 'ruleResultService required for detection rules');

          const childLogger = logger.get('ruleExecution');

          const ruleExecutionSettings = await fetchRuleExecutionSettings(
            config,
            childLogger,
            core,
            savedObjectsClient
          );

          const eventLogWriter = createEventLogWriter(plugins.eventLog);

          return createRuleExecutionLogClientForExecutors(
            ruleExecutionSettings,
            eventLogWriter,
            childLogger,
            context,
            ruleMonitoringService,
            ruleResultService
          );
        }
      );
    },
  };
};
