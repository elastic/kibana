/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsUtils } from '@kbn/core/server';
import { IEventLogService, SAVED_OBJECT_REL_PRIMARY } from '@kbn/event-log-plugin/server';
import {
  RuleExecutionStatus,
  ruleExecutionStatusOrderByStatus,
  RuleExecutionMetrics,
} from '../../../../../common/detection_engine/schemas/common';
import {
  RULE_SAVED_OBJECT_TYPE,
  RULE_EXECUTION_LOG_PROVIDER,
  RuleExecutionLogAction,
} from './constants';

export interface IEventLogWriter {
  logStatusChange(args: StatusChangeArgs): void;
  logExecutionMetrics(args: ExecutionMetricsArgs): void;
}

export interface BaseArgs {
  executionId: string;
  ruleId: string;
  ruleName: string;
  ruleType: string;
  spaceId: string;
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
    logStatusChange({ executionId, ruleId, ruleName, ruleType, spaceId, newStatus, message }) {
      eventLogger.logEvent({
        '@timestamp': nowISO(),
        message,
        rule: {
          id: ruleId,
          name: ruleName,
          category: ruleType,
        },
        event: {
          kind: 'event',
          action: RuleExecutionLogAction['status-change'],
          sequence: sequence++,
        },
        kibana: {
          alert: {
            rule: {
              execution: {
                status: newStatus,
                status_order: ruleExecutionStatusOrderByStatus[newStatus],
                uuid: executionId,
              },
            },
          },
          space_ids: [spaceId],
          saved_objects: [
            {
              rel: SAVED_OBJECT_REL_PRIMARY,
              type: RULE_SAVED_OBJECT_TYPE,
              id: ruleId,
              namespace: spaceIdToNamespace(spaceId),
            },
          ],
        },
      });
    },

    logExecutionMetrics({ executionId, ruleId, ruleName, ruleType, spaceId, metrics }) {
      eventLogger.logEvent({
        '@timestamp': nowISO(),
        rule: {
          id: ruleId,
          name: ruleName,
          category: ruleType,
        },
        event: {
          kind: 'metric',
          action: RuleExecutionLogAction['execution-metrics'],
          sequence: sequence++,
        },
        kibana: {
          alert: {
            rule: {
              execution: {
                metrics,
                uuid: executionId,
              },
            },
          },
          space_ids: [spaceId],
          saved_objects: [
            {
              rel: SAVED_OBJECT_REL_PRIMARY,
              type: RULE_SAVED_OBJECT_TYPE,
              id: ruleId,
              namespace: spaceIdToNamespace(spaceId),
            },
          ],
        },
      });
    },
  };
};

const nowISO = () => new Date().toISOString();

const spaceIdToNamespace = SavedObjectsUtils.namespaceStringToId;
