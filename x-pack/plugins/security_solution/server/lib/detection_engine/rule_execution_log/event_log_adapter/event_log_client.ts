/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsUtils } from '../../../../../../../../src/core/server';
import {
  IEventLogClient,
  IEventLogger,
  IEventLogService,
  SAVED_OBJECT_REL_PRIMARY,
} from '../../../../../../event_log/server';
import { RuleExecutionStatus } from '../../../../../common/detection_engine/schemas/common/schemas';
import { IRuleStatusSOAttributes } from '../../rules/types';
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

interface GetLastStatusChangesArgs {
  ruleId: string;
  count: number;
  includeStatuses?: RuleExecutionStatus[];
}

interface IExecLogEventLogClient {
  getLastStatusChanges(args: GetLastStatusChangesArgs): Promise<IRuleStatusSOAttributes[]>;
  logStatusChange: (args: LogStatusChangeArgs) => void;
  logExecutionMetrics: (args: LogExecutionMetricsArgs) => void;
}

export class EventLogClient implements IExecLogEventLogClient {
  private readonly eventLogClient: IEventLogClient;
  private readonly eventLogger: IEventLogger;
  private sequence = 0;

  constructor(eventLogService: IEventLogService, eventLogClient: IEventLogClient) {
    this.eventLogClient = eventLogClient;
    this.eventLogger = eventLogService.getLogger({
      event: { provider: RULE_EXECUTION_LOG_PROVIDER },
    });
  }

  public async getLastStatusChanges(
    args: GetLastStatusChangesArgs
  ): Promise<IRuleStatusSOAttributes[]> {
    const soType = ALERT_SAVED_OBJECT_TYPE;
    const soIds = [args.ruleId];
    const count = args.count;
    const includeStatuses = (args.includeStatuses ?? []).map((status) => `"${status}"`);

    const filterBy: string[] = [
      `event.provider: ${RULE_EXECUTION_LOG_PROVIDER}`,
      'event.kind: event',
      `event.action: ${RuleExecutionLogAction['status-change']}`,
      includeStatuses.length > 0
        ? `kibana.alert.rule.execution.status:${includeStatuses.join(' ')}`
        : '',
    ];

    const kqlFilter = filterBy
      .filter(Boolean)
      .map((item) => `(${item})`)
      .join(' and ');

    const findResult = await this.eventLogClient.findEventsBySavedObjectIds(soType, soIds, {
      page: 1,
      per_page: count,
      sort_field: '@timestamp',
      sort_order: 'desc',
      filter: kqlFilter,
    });

    return findResult.data.map((event) => {
      const statusDate = event?.['@timestamp'] ?? new Date().toISOString();
      const status = event?.kibana?.alert?.rule?.execution?.status as
        | RuleExecutionStatus
        | undefined;
      const message = event?.message ?? '';

      return {
        statusDate,
        status,
        lastFailureAt: status === RuleExecutionStatus.failed ? statusDate : undefined,
        lastFailureMessage: status === RuleExecutionStatus.failed ? message : undefined,
        lastSuccessAt: status !== RuleExecutionStatus.failed ? statusDate : undefined,
        lastSuccessMessage: status !== RuleExecutionStatus.failed ? message : undefined,
        lastLookBackDate: undefined,
        gap: undefined,
        bulkCreateTimeDurations: undefined,
        searchAfterTimeDurations: undefined,
      };
    });
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
