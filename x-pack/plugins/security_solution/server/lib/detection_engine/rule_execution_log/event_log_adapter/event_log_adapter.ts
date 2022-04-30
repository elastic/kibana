/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sum } from 'lodash';
import { SavedObjectsClientContract } from '../../../../../../../../src/core/server';
import { IEventLogClient, IEventLogService } from '../../../../../../event_log/server';
import { RuleExecutionStatus } from '../../../../../common/detection_engine/schemas/common/schemas';
import { IRuleStatusSOAttributes } from '../../rules/types';
import { SavedObjectsAdapter } from '../saved_objects_adapter/saved_objects_adapter';
import {
  FindBulkExecutionLogArgs,
  FindExecutionLogArgs,
  GetCurrentStatusArgs,
  GetCurrentStatusBulkArgs,
  GetCurrentStatusBulkResult,
  GetLastFailuresArgs,
  IRuleExecutionLogClient,
  LogExecutionMetricsArgs,
  LogStatusChangeArgs,
} from '../types';
import { EventLogClient } from './event_log_client';

const MAX_LAST_FAILURES = 5;

export class EventLogAdapter implements IRuleExecutionLogClient {
  private eventLogClient: EventLogClient;
  /**
   * @deprecated Saved objects adapter is used during the transition period while the event log doesn't support all features needed to implement the execution log.
   * We use savedObjectsAdapter to write/read the latest rule execution status and eventLogClient to read/write historical execution data.
   * We can remove savedObjectsAdapter as soon as the event log supports all methods that we need (find, findBulk).
   */
  private savedObjectsAdapter: IRuleExecutionLogClient;

  constructor(
    eventLogService: IEventLogService,
    eventLogClient: IEventLogClient | undefined,
    savedObjectsClient: SavedObjectsClientContract
  ) {
    this.eventLogClient = new EventLogClient(eventLogService, eventLogClient);
    this.savedObjectsAdapter = new SavedObjectsAdapter(savedObjectsClient);
  }

  /** @deprecated */
  public async find(args: FindExecutionLogArgs) {
    return this.savedObjectsAdapter.find(args);
  }

  /** @deprecated */
  public async findBulk(args: FindBulkExecutionLogArgs) {
    return this.savedObjectsAdapter.findBulk(args);
  }

  public getLastFailures(args: GetLastFailuresArgs): Promise<IRuleStatusSOAttributes[]> {
    const { ruleId } = args;
    return this.eventLogClient.getLastStatusChanges({
      ruleId,
      count: MAX_LAST_FAILURES,
      includeStatuses: [RuleExecutionStatus.failed],
    });
  }

  public getCurrentStatus(
    args: GetCurrentStatusArgs
  ): Promise<IRuleStatusSOAttributes | undefined> {
    return this.savedObjectsAdapter.getCurrentStatus(args);
  }

  public getCurrentStatusBulk(args: GetCurrentStatusBulkArgs): Promise<GetCurrentStatusBulkResult> {
    return this.savedObjectsAdapter.getCurrentStatusBulk(args);
  }

  public async deleteCurrentStatus(ruleId: string): Promise<void> {
    await this.savedObjectsAdapter.deleteCurrentStatus(ruleId);

    // EventLog execution events are immutable, nothing to do here
  }

  public async logStatusChange(args: LogStatusChangeArgs): Promise<void> {
    await Promise.all([
      this.logStatusChangeToSavedObjects(args),
      this.logStatusChangeToEventLog(args),
    ]);
  }

  private async logStatusChangeToSavedObjects(args: LogStatusChangeArgs): Promise<void> {
    await this.savedObjectsAdapter.logStatusChange(args);
  }

  private async logStatusChangeToEventLog(args: LogStatusChangeArgs): Promise<void> {
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

  private logExecutionMetrics(args: LogExecutionMetricsArgs): void {
    const { ruleId, spaceId, ruleType, ruleName, metrics } = args;

    this.eventLogClient.logExecutionMetrics({
      ruleId,
      ruleName,
      ruleType,
      spaceId,
      metrics: {
        executionGapDuration: metrics.executionGap?.asSeconds(),
        totalIndexingDuration: metrics.indexingDurations
          ? sum(metrics.indexingDurations.map(Number))
          : undefined,
        totalSearchDuration: metrics.searchDurations
          ? sum(metrics.searchDurations.map(Number))
          : undefined,
      },
    });
  }
}
