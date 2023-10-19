/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsImporter, Logger } from '@kbn/core/server';
import { withSecuritySpan } from '../../../../../utils/with_security_span';
import type { ExtMeta } from '../utils/console_logging';

import type {
  ClusterHealthParameters,
  ClusterHealthSnapshot,
  RuleHealthParameters,
  RuleHealthSnapshot,
  SpaceHealthParameters,
  SpaceHealthSnapshot,
} from '../../../../../../common/api/detection_engine/rule_monitoring';

import type { IEventLogHealthClient } from './event_log/event_log_health_client';
import type { IRuleObjectsHealthClient } from './rule_objects/rule_objects_health_client';
import type { IRuleSpacesClient } from './rule_spaces/rule_spaces_client';
import type { IDetectionEngineHealthClient } from './detection_engine_health_client_interface';
import { installAssetsForRuleMonitoring } from './assets/install_assets_for_rule_monitoring';

export const createDetectionEngineHealthClient = (
  ruleSpacesClient: IRuleSpacesClient,
  ruleObjectsHealthClient: IRuleObjectsHealthClient,
  eventLogHealthClient: IEventLogHealthClient,
  savedObjectsImporter: ISavedObjectsImporter,
  logger: Logger
): IDetectionEngineHealthClient => {
  const currentSpaceId = ruleSpacesClient.getCurrentSpaceId();

  return {
    calculateRuleHealth: (args: RuleHealthParameters): Promise<RuleHealthSnapshot> => {
      return withSecuritySpan('IDetectionEngineHealthClient.calculateRuleHealth', async () => {
        const ruleId = args.rule_id;
        try {
          // We call these two sequentially, because if the rule doesn't exist we need to throw 404
          // from ruleObjectsHealthClient before we calculate expensive stats in eventLogHealthClient.
          const statsBasedOnRuleObjects = await ruleObjectsHealthClient.calculateRuleHealth(args);
          const statsBasedOnEventLog = await eventLogHealthClient.calculateRuleHealth(args);

          return {
            state_at_the_moment: statsBasedOnRuleObjects.state_at_the_moment,
            stats_over_interval: statsBasedOnEventLog.stats_over_interval,
            history_over_interval: statsBasedOnEventLog.history_over_interval,
            debug: {
              ...statsBasedOnRuleObjects.debug,
              ...statsBasedOnEventLog.debug,
            },
          };
        } catch (e) {
          const logMessage = 'Error calculating rule health';
          const logReason = e instanceof Error ? e.message : String(e);
          const logSuffix = `[rule id ${ruleId}][space id ${currentSpaceId}]`;
          const logMeta: ExtMeta = {
            rule: { id: ruleId },
            kibana: { spaceId: currentSpaceId },
          };

          logger.error(`${logMessage}: ${logReason} ${logSuffix}`, logMeta);
          throw e;
        }
      });
    },

    calculateSpaceHealth: (args: SpaceHealthParameters): Promise<SpaceHealthSnapshot> => {
      return withSecuritySpan('IDetectionEngineHealthClient.calculateSpaceHealth', async () => {
        try {
          const [statsBasedOnRuleObjects, statsBasedOnEventLog] = await Promise.all([
            ruleObjectsHealthClient.calculateSpaceHealth(args),
            eventLogHealthClient.calculateSpaceHealth(args),
          ]);

          return {
            state_at_the_moment: statsBasedOnRuleObjects.state_at_the_moment,
            stats_over_interval: statsBasedOnEventLog.stats_over_interval,
            history_over_interval: statsBasedOnEventLog.history_over_interval,
            debug: {
              ...statsBasedOnRuleObjects.debug,
              ...statsBasedOnEventLog.debug,
            },
          };
        } catch (e) {
          const logMessage = 'Error calculating space health';
          const logReason = e instanceof Error ? e.message : String(e);
          const logSuffix = `[space id ${currentSpaceId}]`;
          const logMeta: ExtMeta = {
            kibana: { spaceId: currentSpaceId },
          };

          logger.error(`${logMessage}: ${logReason} ${logSuffix}`, logMeta);
          throw e;
        }
      });
    },

    calculateClusterHealth: (args: ClusterHealthParameters): Promise<ClusterHealthSnapshot> => {
      return withSecuritySpan('IDetectionEngineHealthClient.calculateClusterHealth', async () => {
        try {
          const [statsBasedOnRuleObjects, statsBasedOnEventLog] = await Promise.all([
            ruleObjectsHealthClient.calculateClusterHealth(args),
            eventLogHealthClient.calculateClusterHealth(args),
          ]);

          return {
            state_at_the_moment: statsBasedOnRuleObjects.state_at_the_moment,
            stats_over_interval: statsBasedOnEventLog.stats_over_interval,
            history_over_interval: statsBasedOnEventLog.history_over_interval,
            debug: {
              ...statsBasedOnRuleObjects.debug,
              ...statsBasedOnEventLog.debug,
            },
          };
        } catch (e) {
          const logMessage = 'Error calculating cluster health';
          const logReason = e instanceof Error ? e.message : String(e);
          const logSuffix = `[space id ${currentSpaceId}]`;
          const logMeta: ExtMeta = {
            kibana: { spaceId: currentSpaceId },
          };

          logger.error(`${logMessage}: ${logReason} ${logSuffix}`, logMeta);
          throw e;
        }
      });
    },

    installAssetsForMonitoringHealth: (): Promise<void> => {
      return withSecuritySpan(
        'IDetectionEngineHealthClient.installAssetsForMonitoringHealth',
        async () => {
          try {
            await installAssetsForRuleMonitoring(savedObjectsImporter, logger, currentSpaceId);
          } catch (e) {
            const logMessage = 'Error installing assets for monitoring Detection Engine health';
            const logReason = e instanceof Error ? e.message : String(e);
            const logSuffix = `[space id ${currentSpaceId}]`;
            const logMeta: ExtMeta = {
              kibana: { spaceId: currentSpaceId },
            };

            logger.error(`${logMessage}: ${logReason} ${logSuffix}`, logMeta);
            throw e;
          }
        }
      );
    },
  };
};
