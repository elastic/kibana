/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sum } from 'lodash';
import { SavedObjectsClientContract } from '../../../../../../../../src/core/server';
import { IEventLogService } from '../../../../../../event_log/server';
import { SavedObjectsAdapter } from '../saved_objects_adapter/saved_objects_adapter';
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
  /**
   * @deprecated Saved objects adapter is used during the transition period while the event log doesn't support all features needed to implement the execution log.
   * We use savedObjectsAdapter to write/read the latest rule execution status and eventLogClient to read/write historical execution data.
   * We can remove savedObjectsAdapter as soon as the event log supports all methods that we need (find, findBulk).
   */
  private savedObjectsAdapter: IRuleExecutionLogClient;

  constructor(eventLogService: IEventLogService, savedObjectsClient: SavedObjectsClientContract) {
    this.eventLogClient = new EventLogClient(eventLogService);
    this.savedObjectsAdapter = new SavedObjectsAdapter(savedObjectsClient);
  }

  public async find(args: FindExecutionLogArgs) {
    return this.savedObjectsAdapter.find(args);
  }

  public async findBulk(args: FindBulkExecutionLogArgs) {
    return this.savedObjectsAdapter.findBulk(args);
  }

  public async update(args: UpdateExecutionLogArgs) {
    const { attributes, spaceId, ruleId, ruleName, ruleType } = args;

    await this.savedObjectsAdapter.update(args);

    // EventLog execution events are immutable, so we just log a status change istead of updating previous
    if (attributes.status) {
      this.eventLogClient.logStatusChange({
        ruleName,
        ruleType,
        ruleId,
        newStatus: attributes.status,
        spaceId,
      });
    }
  }

  public async delete(id: string) {
    await this.savedObjectsAdapter.delete(id);

    // EventLog execution events are immutable, nothing to do here
  }

  public async logExecutionMetrics(args: LogExecutionMetricsArgs) {
    const { ruleId, spaceId, ruleType, ruleName, metrics } = args;
    await this.savedObjectsAdapter.logExecutionMetrics(args);

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

  public async logStatusChange(args: LogStatusChangeArgs) {
    await this.savedObjectsAdapter.logStatusChange(args);

    if (args.metrics) {
      await this.logExecutionMetrics({
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
