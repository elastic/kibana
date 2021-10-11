/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEventLogService } from '../../../../../../event_log/server';
import {
  FindBulkExecutionLogArgs,
  FindExecutionLogArgs,
  IRuleExecutionLogClient,
  LogExecutionMetricsArgs,
  LogStatusChangeArgs,
  UpdateExecutionLogArgs,
} from '../types';
import { EventLogClient } from './event_log_client';

export class EventLogAdapter implements IRuleExecutionLogClient {
  private eventLogClient: EventLogClient;

  constructor(eventLogService: IEventLogService) {
    this.eventLogClient = new EventLogClient(eventLogService);
  }

  public async find({ ruleId, logsCount = 1, spaceId }: FindExecutionLogArgs) {
    return []; // TODO Implement
  }

  public async findBulk({ ruleIds, logsCount = 1, spaceId }: FindBulkExecutionLogArgs) {
    return {}; // TODO Implement
  }

  public async update({ attributes, spaceId, ruleName, ruleType }: UpdateExecutionLogArgs) {
    // execution events are immutable, so we just log a status change istead of updating previous
    if (attributes.status) {
      this.eventLogClient.logStatusChange({
        ruleName,
        ruleType,
        ruleId: attributes.alertId,
        newStatus: attributes.status,
        spaceId,
      });
    }
  }

  public async delete(id: string) {
    // execution events are immutable, nothing to do here
  }

  public async logExecutionMetrics({
    ruleId,
    spaceId,
    ruleType,
    ruleName,
    metrics,
  }: LogExecutionMetricsArgs) {
    this.eventLogClient.logExecutionMetrics({
      ruleId,
      ruleName,
      ruleType,
      spaceId,
      metrics: {
        executionGapDuration: metrics.executionGap?.asSeconds(),
        totalIndexingDuration: metrics.indexingDurations?.reduce(
          (acc, cur) => acc + Number(cur),
          0
        ),
        totalSearchDuration: metrics.searchDurations?.reduce((acc, cur) => acc + Number(cur), 0),
      },
    });
  }

  public async logStatusChange(args: LogStatusChangeArgs) {
    if (args.metrics) {
      this.logExecutionMetrics({
        ruleId: args.ruleId,
        ruleName: args.ruleName,
        ruleType: args.ruleType,
        spaceId: args.spaceId,
        metrics: args.metrics,
      });
    }

    this.eventLogClient.logStatusChange(args);
  }
}
