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
import { invariant } from '../../../../../common/utils/invariant';
import { IRuleStatusSOAttributes } from '../../rules/types';
import { LogStatusChangeArgs } from '../types';
import {
  RuleExecutionLogAction,
  RULE_EXECUTION_LOG_PROVIDER,
  ALERT_SAVED_OBJECT_TYPE,
} from './constants';

const spaceIdToNamespace = SavedObjectsUtils.namespaceStringToId;

const now = () => new Date().toISOString();

const statusSeverityDict: Record<RuleExecutionStatus, number> = {
  [RuleExecutionStatus.succeeded]: 0,
  [RuleExecutionStatus['going to run']]: 10,
  [RuleExecutionStatus.warning]: 20,
  [RuleExecutionStatus['partial failure']]: 20,
  [RuleExecutionStatus.failed]: 30,
};

interface LogExecutionMetricsArgs {
  executionId: string;
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
  private readonly eventLogClient: IEventLogClient | undefined;
  private readonly eventLogger: IEventLogger;
  private sequence = 0;

  constructor(eventLogService: IEventLogService, eventLogClient: IEventLogClient | undefined) {
    this.eventLogClient = eventLogClient;
    this.eventLogger = eventLogService.getLogger({
      event: { provider: RULE_EXECUTION_LOG_PROVIDER },
    });
  }

  public async getLastStatusChanges(
    args: GetLastStatusChangesArgs
  ): Promise<IRuleStatusSOAttributes[]> {
    if (!this.eventLogClient) {
      throw new Error('Querying Event Log from a rule executor is not supported at this moment');
    }

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
      invariant(event, 'Event not found');
      invariant(event['@timestamp'], 'Required "@timestamp" field is not found');

      const statusDate = event['@timestamp'];
      const status = event.kibana?.alert?.rule?.execution?.status as
        | RuleExecutionStatus
        | undefined;
      const isStatusFailed = status === RuleExecutionStatus.failed;
      const message = event.message ?? '';

      return {
        statusDate,
        status,
        lastFailureAt: isStatusFailed ? statusDate : undefined,
        lastFailureMessage: isStatusFailed ? message : undefined,
        lastSuccessAt: !isStatusFailed ? statusDate : undefined,
        lastSuccessMessage: !isStatusFailed ? message : undefined,
        lastLookBackDate: undefined,
        gap: undefined,
        bulkCreateTimeDurations: undefined,
        searchAfterTimeDurations: undefined,
      };
    });
  }

  public logExecutionMetrics({
    executionId,
    ruleId,
    ruleName,
    ruleType,
    metrics,
    spaceId,
  }: LogExecutionMetricsArgs) {
    this.eventLogger.logEvent({
      '@timestamp': now(),
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
              uuid: executionId,
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
    executionId,
    ruleId,
    ruleName,
    ruleType,
    newStatus,
    message,
    spaceId,
  }: LogStatusChangeArgs) {
    this.eventLogger.logEvent({
      '@timestamp': now(),
      message,
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
      kibana: {
        alert: {
          rule: {
            execution: {
              status: newStatus,
              status_order: statusSeverityDict[newStatus],
              uuid: executionId,
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
