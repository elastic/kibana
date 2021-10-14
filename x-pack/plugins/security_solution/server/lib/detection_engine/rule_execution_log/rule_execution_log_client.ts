/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '../../../../../../../src/core/server';
import { IEventLogService } from '../../../../../event_log/server';
import { EventLogAdapter } from './event_log_adapter/event_log_adapter';
import { SavedObjectsAdapter } from './saved_objects_adapter/saved_objects_adapter';
import {
  LogExecutionMetricsArgs,
  FindBulkExecutionLogArgs,
  FindExecutionLogArgs,
  IRuleExecutionLogClient,
  LogStatusChangeArgs,
  UpdateExecutionLogArgs,
  UnderlyingLogClient,
} from './types';
import { truncateMessage } from './utils/normalization';

export interface RuleExecutionLogClientArgs {
  savedObjectsClient: SavedObjectsClientContract;
  eventLogService: IEventLogService;
  underlyingClient: UnderlyingLogClient;
}

export class RuleExecutionLogClient implements IRuleExecutionLogClient {
  private client: IRuleExecutionLogClient;

  constructor({
    savedObjectsClient,
    eventLogService,
    underlyingClient,
  }: RuleExecutionLogClientArgs) {
    switch (underlyingClient) {
      case UnderlyingLogClient.savedObjects:
        this.client = new SavedObjectsAdapter(savedObjectsClient);
        break;
      case UnderlyingLogClient.eventLog:
        this.client = new EventLogAdapter(eventLogService, savedObjectsClient);
        break;
    }
  }

  public find(args: FindExecutionLogArgs) {
    return this.client.find(args);
  }

  public findBulk(args: FindBulkExecutionLogArgs) {
    return this.client.findBulk(args);
  }

  public async update(args: UpdateExecutionLogArgs) {
    const { lastFailureMessage, lastSuccessMessage, ...restAttributes } = args.attributes;

    return this.client.update({
      ...args,
      attributes: {
        lastFailureMessage: truncateMessage(lastFailureMessage),
        lastSuccessMessage: truncateMessage(lastSuccessMessage),
        ...restAttributes,
      },
    });
  }

  public async delete(id: string) {
    return this.client.delete(id);
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
