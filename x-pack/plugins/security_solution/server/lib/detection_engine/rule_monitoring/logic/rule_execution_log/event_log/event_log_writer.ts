/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsUtils } from '@kbn/core/server';
import type { IEventLogService } from '@kbn/event-log-plugin/server';
import { SAVED_OBJECT_REL_PRIMARY } from '@kbn/event-log-plugin/server';
import type {
  RuleExecutionMetrics,
  RuleExecutionStatus,
} from '../../../../../../../common/detection_engine/rule_monitoring';
import {
  LogLevel,
  logLevelFromExecutionStatus,
  logLevelToNumber,
  RuleExecutionEventType,
  ruleExecutionStatusToNumber,
} from '../../../../../../../common/detection_engine/rule_monitoring';
import { RULE_SAVED_OBJECT_TYPE, RULE_EXECUTION_LOG_PROVIDER } from './constants';

export interface IEventLogWriter {
  logMessage(args: MessageArgs): void;
  logStatusChange(args: StatusChangeArgs): void;
  logExecutionMetrics(args: ExecutionMetricsArgs): void;
}

export interface BaseArgs {
  ruleId: string;
  ruleUuid: string;
  ruleName: string;
  ruleType: string;
  spaceId: string;
  executionId: string;
}

export interface MessageArgs extends BaseArgs {
  logLevel: LogLevel;
  message: string;
}

export interface StatusChangeArgs extends BaseArgs {
  newStatus: RuleExecutionStatus;
  message?: string;
}

export interface ExecutionMetricsArgs extends BaseArgs {
  metrics: RuleExecutionMetrics;
}

export const createEventLogWriter = (eventLogService: IEventLogService): IEventLogWriter => {
  const eventLogger = eventLogService.getLogger({
    event: { provider: RULE_EXECUTION_LOG_PROVIDER },
  });

  let sequence = 0;

  return {
    logMessage: (args: MessageArgs): void => {
      eventLogger.logEvent({
        '@timestamp': nowISO(),
        message: args.message,
        rule: {
          id: args.ruleId,
          uuid: args.ruleUuid,
          name: args.ruleName,
          category: args.ruleType,
        },
        event: {
          kind: 'event',
          action: RuleExecutionEventType.message,
          sequence: sequence++,
          severity: logLevelToNumber(args.logLevel),
        },
        log: {
          level: args.logLevel,
        },
        kibana: {
          alert: {
            rule: {
              execution: {
                uuid: args.executionId,
              },
            },
          },
          space_ids: [args.spaceId],
          saved_objects: [
            {
              rel: SAVED_OBJECT_REL_PRIMARY,
              type: RULE_SAVED_OBJECT_TYPE,
              id: args.ruleId,
              namespace: spaceIdToNamespace(args.spaceId),
            },
          ],
        },
      });
    },

    logStatusChange: (args: StatusChangeArgs): void => {
      const logLevel = logLevelFromExecutionStatus(args.newStatus);
      eventLogger.logEvent({
        '@timestamp': nowISO(),
        message: args.message,
        rule: {
          id: args.ruleId,
          uuid: args.ruleUuid,
          name: args.ruleName,
          category: args.ruleType,
        },
        event: {
          kind: 'event',
          action: RuleExecutionEventType['status-change'],
          sequence: sequence++,
          severity: logLevelToNumber(logLevel),
        },
        log: {
          level: logLevel,
        },
        kibana: {
          alert: {
            rule: {
              execution: {
                uuid: args.executionId,
                status: args.newStatus,
                status_order: ruleExecutionStatusToNumber(args.newStatus),
              },
            },
          },
          space_ids: [args.spaceId],
          saved_objects: [
            {
              rel: SAVED_OBJECT_REL_PRIMARY,
              type: RULE_SAVED_OBJECT_TYPE,
              id: args.ruleId,
              namespace: spaceIdToNamespace(args.spaceId),
            },
          ],
        },
      });
    },

    logExecutionMetrics: (args: ExecutionMetricsArgs): void => {
      const logLevel = LogLevel.debug;
      eventLogger.logEvent({
        '@timestamp': nowISO(),
        rule: {
          id: args.ruleId,
          uuid: args.ruleUuid,
          name: args.ruleName,
          category: args.ruleType,
        },
        event: {
          kind: 'metric',
          action: RuleExecutionEventType['execution-metrics'],
          sequence: sequence++,
          severity: logLevelToNumber(logLevel),
        },
        log: {
          level: logLevel,
        },
        kibana: {
          alert: {
            rule: {
              execution: {
                uuid: args.executionId,
                metrics: args.metrics,
              },
            },
          },
          space_ids: [args.spaceId],
          saved_objects: [
            {
              rel: SAVED_OBJECT_REL_PRIMARY,
              type: RULE_SAVED_OBJECT_TYPE,
              id: args.ruleId,
              namespace: spaceIdToNamespace(args.spaceId),
            },
          ],
        },
      });
    },
  };
};

const nowISO = () => new Date().toISOString();

const spaceIdToNamespace = SavedObjectsUtils.namespaceStringToId;
