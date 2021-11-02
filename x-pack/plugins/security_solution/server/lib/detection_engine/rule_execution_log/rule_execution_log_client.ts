/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '../../../../../../../src/core/server';
import { IEventLogClient, IEventLogService } from '../../../../../event_log/server';
import { IRuleStatusSOAttributes } from '../rules/types';
import { EventLogAdapter } from './event_log_adapter/event_log_adapter';
import { SavedObjectsAdapter } from './saved_objects_adapter/saved_objects_adapter';
import {
  LogExecutionMetricsArgs,
  FindBulkExecutionLogArgs,
  FindExecutionLogArgs,
  IRuleExecutionLogClient,
  LogStatusChangeArgs,
  UnderlyingLogClient,
  GetLastFailuresArgs,
  GetCurrentStatusArgs,
  GetCurrentStatusBulkArgs,
  GetCurrentStatusBulkResult,
} from './types';
import { truncateMessage } from './utils/normalization';

interface ConstructorParams {
  underlyingClient: UnderlyingLogClient;
  savedObjectsClient: SavedObjectsClientContract;
  eventLogService: IEventLogService;
  eventLogClient?: IEventLogClient;
}

export class RuleExecutionLogClient implements IRuleExecutionLogClient {
  private client: IRuleExecutionLogClient;

  constructor(params: ConstructorParams) {
    const { underlyingClient, eventLogService, eventLogClient, savedObjectsClient } = params;

    switch (underlyingClient) {
      case UnderlyingLogClient.savedObjects:
        this.client = new SavedObjectsAdapter(savedObjectsClient);
        break;
      case UnderlyingLogClient.eventLog:
        this.client = new EventLogAdapter(eventLogService, eventLogClient, savedObjectsClient);
        break;
    }
  }

  /** @deprecated */
  public find(args: FindExecutionLogArgs) {
    return this.client.find(args);
  }

  /** @deprecated */
  public findBulk(args: FindBulkExecutionLogArgs) {
    return this.client.findBulk(args);
  }

  public getLastFailures(args: GetLastFailuresArgs): Promise<IRuleStatusSOAttributes[]> {
    return this.client.getLastFailures(args);
  }

  public getCurrentStatus(
    args: GetCurrentStatusArgs
  ): Promise<IRuleStatusSOAttributes | undefined> {
    return this.client.getCurrentStatus(args);
  }

  public getCurrentStatusBulk(args: GetCurrentStatusBulkArgs): Promise<GetCurrentStatusBulkResult> {
    return this.client.getCurrentStatusBulk(args);
  }

  public deleteCurrentStatus(ruleId: string): Promise<void> {
    return this.client.deleteCurrentStatus(ruleId);
  }

  public async logExecutionMetrics(args: LogExecutionMetricsArgs) {
    return this.client.logExecutionMetrics(args);
  }

  public async logStatusChange(args: LogStatusChangeArgs) {
    const message = args.message ? truncateMessage(args.message) : args.message;
    return this.client.logStatusChange({
      ...args,
      message,
    });
  }
}
