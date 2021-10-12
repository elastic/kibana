/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsUtils } from '../../../../../../../../src/core/server';
import {
  IEventLogger,
  IEventLogService,
  SAVED_OBJECT_REL_PRIMARY,
} from '../../../../../../event_log/server';
import { RuleExecutionStatus } from '../../../../../common/detection_engine/schemas/common/schemas';
import { LogStatusChangeArgs } from '../types';
import {
  RuleExecutionLogAction,
  RULE_EXECUTION_LOG_PROVIDER,
  ALERT_SAVED_OBJECT_TYPE,
} from './constants';

const spaceIdToNamespace = SavedObjectsUtils.namespaceStringToId;

const statusSeverityDict: Record<RuleExecutionStatus, number> = {
  [RuleExecutionStatus.succeeded]: 0,
  [RuleExecutionStatus['going to run']]: 10,
  [RuleExecutionStatus.warning]: 20,
  [RuleExecutionStatus['partial failure']]: 20,
  [RuleExecutionStatus.failed]: 30,
};

interface FindExecutionLogArgs {
  ruleIds: string[];
  spaceId: string;
  logsCount?: number;
  statuses?: RuleExecutionStatus[];
}

interface LogExecutionMetricsArgs {
  ruleId: string;
  ruleName: string;
  ruleType: string;
  spaceId: string;
  metrics: EventLogExecutionMetrics;
}

interface EventLogExecutionMetrics {
  totalSearchDuration?: number;
  totalIndexingDuration?: number;
  executionGapDuration?: number;
}

interface IExecLogEventLogClient {
  find: (args: FindExecutionLogArgs) => Promise<{}>;
  logStatusChange: (args: LogStatusChangeArgs) => void;
  logExecutionMetrics: (args: LogExecutionMetricsArgs) => void;
}

export class EventLogClient implements IExecLogEventLogClient {
  private sequence = 0;
  private eventLogger: IEventLogger;

  constructor(eventLogService: IEventLogService) {
    this.eventLogger = eventLogService.getLogger({
      event: { provider: RULE_EXECUTION_LOG_PROVIDER },
    });
  }

  public async find({ ruleIds, spaceId, statuses, logsCount = 1 }: FindExecutionLogArgs) {
    return {}; // TODO implement
  }

  public logExecutionMetrics({
    ruleId,
    ruleName,
    ruleType,
    metrics,
    spaceId,
  }: LogExecutionMetricsArgs) {
    this.eventLogger.logEvent({
      rule: {
        id: ruleId,
        name: ruleName,
        category: ruleType,
      },
      event: {
        kind: 'metric',
        action: RuleExecutionLogAction['execution-metrics'],
        sequence: this.sequence++,
      },
      kibana: {
        alert: {
          rule: {
            execution: {
              metrics: {
                execution_gap_duration_s: metrics.executionGapDuration,
                total_search_duration_ms: metrics.totalSearchDuration,
                total_indexing_duration_ms: metrics.totalIndexingDuration,
              },
            },
          },
        },
        space_ids: [spaceId],
        saved_objects: [
          {
            rel: SAVED_OBJECT_REL_PRIMARY,
            type: ALERT_SAVED_OBJECT_TYPE,
            id: ruleId,
            namespace: spaceIdToNamespace(spaceId),
          },
        ],
      },
    });
  }

  public logStatusChange({
    ruleId,
    ruleName,
    ruleType,
    newStatus,
    message,
    spaceId,
  }: LogStatusChangeArgs) {
    this.eventLogger.logEvent({
      rule: {
        id: ruleId,
        name: ruleName,
        category: ruleType,
      },
      event: {
        kind: 'event',
        action: RuleExecutionLogAction['status-change'],
        sequence: this.sequence++,
      },
      message,
      kibana: {
        alert: {
          rule: {
            execution: {
              status: newStatus,
              status_order: statusSeverityDict[newStatus],
            },
          },
        },
        space_ids: [spaceId],
        saved_objects: [
          {
            rel: SAVED_OBJECT_REL_PRIMARY,
            type: ALERT_SAVED_OBJECT_TYPE,
            id: ruleId,
            namespace: spaceIdToNamespace(spaceId),
          },
        ],
      },
    });
  }
}
