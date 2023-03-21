/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { withSecuritySpan } from '../../../../../../utils/with_security_span';
import type { ExtMeta } from '../utils/console_logging';

import type {
  GetRuleExecutionEventsResponse,
  GetRuleExecutionResultsResponse,
} from '../../../../../../../common/detection_engine/rule_monitoring';

import type { IEventLogReader } from '../event_log/event_log_reader';
import type {
  GetExecutionEventsArgs,
  GetExecutionResultsArgs,
  IRuleExecutionLogForRoutes,
} from './client_interface';

export const createClientForRoutes = (
  eventLog: IEventLogReader,
  logger: Logger
): IRuleExecutionLogForRoutes => {
  return {
    getExecutionEvents: (args: GetExecutionEventsArgs): Promise<GetRuleExecutionEventsResponse> => {
      return withSecuritySpan('IRuleExecutionLogForRoutes.getExecutionEvents', async () => {
        const { ruleId } = args;
        try {
          return await eventLog.getExecutionEvents(args);
        } catch (e) {
          const logMessage = 'Error getting plain execution events from event log';
          const logReason = e instanceof Error ? e.message : String(e);
          const logSuffix = `[rule id ${ruleId}]`;
          const logMeta: ExtMeta = {
            rule: { id: ruleId },
          };

          logger.error(`${logMessage}: ${logReason} ${logSuffix}`, logMeta);
          throw e;
        }
      });
    },

    getExecutionResults: (
      args: GetExecutionResultsArgs
    ): Promise<GetRuleExecutionResultsResponse> => {
      return withSecuritySpan('IRuleExecutionLogForRoutes.getExecutionResults', async () => {
        const { ruleId } = args;
        try {
          return await eventLog.getExecutionResults(args);
        } catch (e) {
          const logMessage = 'Error getting aggregate execution results from event log';
          const logReason = e instanceof Error ? e.message : String(e);
          const logSuffix = `[rule id ${ruleId}]`;
          const logMeta: ExtMeta = {
            rule: { id: ruleId },
          };

          logger.error(`${logMessage}: ${logReason} ${logSuffix}`, logMeta);
          throw e;
        }
      });
    },
  };
};
