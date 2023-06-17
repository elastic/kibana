/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { SavedObjectsClient } from '@kbn/core/server';
import { invariant } from '../../../../../common/utils/invariant';
import type { ConfigType } from '../../../../config';
import { withSecuritySpan } from '../../../../utils/with_security_span';
import type {
  SecuritySolutionPluginCoreSetupDependencies,
  SecuritySolutionPluginCoreStartDependencies,
  SecuritySolutionPluginSetupDependencies,
  SecuritySolutionPluginStartDependencies,
} from '../../../../plugin_contract';

import type { IDetectionEngineHealthClient } from './detection_engine_health/detection_engine_health_client_interface';
import type { IRuleExecutionLogForRoutes } from './rule_execution_log/client_for_routes/client_interface';
import { createRuleExecutionLogClientForRoutes } from './rule_execution_log/client_for_routes/client';
import type { IRuleExecutionLogForExecutors } from './rule_execution_log/client_for_executors/client_interface';
import { createRuleExecutionLogClientForExecutors } from './rule_execution_log/client_for_executors/client';

import { registerEventLogProvider } from './event_log/register_event_log_provider';
import { installAssetsForRuleMonitoring } from './detection_engine_health/assets/install_assets_for_rule_monitoring';
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
  logger: Logger
): IRuleMonitoringService => {
  let coreSetup: SecuritySolutionPluginCoreSetupDependencies | null = null;
  let pluginsSetup: SecuritySolutionPluginSetupDependencies | null = null;

  return {
    setup: (
      core: SecuritySolutionPluginCoreSetupDependencies,
      plugins: SecuritySolutionPluginSetupDependencies
    ): void => {
      coreSetup = core;
      pluginsSetup = plugins;

      registerEventLogProvider(plugins.eventLog);
    },

    start: (
      core: SecuritySolutionPluginCoreStartDependencies,
      plugins: SecuritySolutionPluginStartDependencies
    ): void => {
      const { savedObjects } = core;
      const savedObjectsRepository = savedObjects.createInternalRepository();
      const savedObjectsClient = new SavedObjectsClient(savedObjectsRepository);
      const savedObjectsImporter = savedObjects.createImporter(savedObjectsClient);

      Promise.resolve()
        .then(
          () => installAssetsForRuleMonitoring(savedObjectsImporter, logger),
          (e) => {
            const logMessage = 'Error installing assets for monitoring Detection Engine health';
            const logReason = e instanceof Error ? e.message : String(e);

            logger.error(`${logMessage}: ${logReason}`);
            logger.error(e);
          }
        )
        .catch((e) => {
          const logMessage = 'Error starting rule monitoring service';
          const logReason = e instanceof Error ? e.message : String(e);

          logger.error(`${logMessage}: ${logReason}`);
          logger.error(e);
        });
    },

    createDetectionEngineHealthClient: (
      params: DetectionEngineHealthClientParams
    ): IDetectionEngineHealthClient => {
      const { savedObjectsImporter, rulesClient, eventLogClient, currentSpaceId } = params;
      const ruleObjectsHealthClient = createRuleObjectsHealthClient(rulesClient);
      const eventLogHealthClient = createEventLogHealthClient(eventLogClient);

      return createDetectionEngineHealthClient(
        ruleObjectsHealthClient,
        eventLogHealthClient,
        savedObjectsImporter,
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

          invariant(coreSetup, 'Dependencies of RuleMonitoringService are not initialized');
          invariant(pluginsSetup, 'Dependencies of RuleMonitoringService are not initialized');
          invariant(ruleMonitoringService, 'ruleMonitoringService required for detection rules');
          invariant(ruleResultService, 'ruleResultService required for detection rules');

          const childLogger = logger.get('ruleExecution');

          const ruleExecutionSettings = await fetchRuleExecutionSettings(
            config,
            childLogger,
            coreSetup,
            savedObjectsClient
          );

          const eventLogWriter = createEventLogWriter(pluginsSetup.eventLog);

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
