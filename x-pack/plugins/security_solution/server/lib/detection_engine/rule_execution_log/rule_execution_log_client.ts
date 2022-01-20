/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, SavedObjectsClientContract } from 'src/core/server';
import { IEventLogClient, IEventLogService } from '../../../../../event_log/server';
import { IRuleStatusSOAttributes } from '../rules/types';
import { EventLogAdapter } from './event_log_adapter/event_log_adapter';
import { SavedObjectsAdapter } from './saved_objects_adapter/saved_objects_adapter';
import {
  FindBulkExecutionLogArgs,
  FindExecutionLogArgs,
  IRuleExecutionLogClient,
  LogStatusChangeArgs,
  UnderlyingLogClient,
  GetLastFailuresArgs,
  GetCurrentStatusArgs,
  GetCurrentStatusBulkArgs,
  GetCurrentStatusBulkResult,
  ExtMeta,
} from './types';
import { truncateMessage } from './utils/normalization';

interface ConstructorParams {
  underlyingClient: UnderlyingLogClient;
  savedObjectsClient: SavedObjectsClientContract;
  eventLogService: IEventLogService;
  eventLogClient?: IEventLogClient;
  logger: Logger;
}

export class RuleExecutionLogClient implements IRuleExecutionLogClient {
  private readonly client: IRuleExecutionLogClient;
  private readonly logger: Logger;

  constructor(params: ConstructorParams) {
    const { underlyingClient, eventLogService, eventLogClient, savedObjectsClient, logger } =
      params;

    switch (underlyingClient) {
      case UnderlyingLogClient.savedObjects:
        this.client = new SavedObjectsAdapter(savedObjectsClient);
        break;
      case UnderlyingLogClient.eventLog:
        this.client = new EventLogAdapter(eventLogService, eventLogClient, savedObjectsClient);
        break;
    }

    // We write rule execution logs via a child console logger with the context
    // "plugins.securitySolution.ruleExecution"
    this.logger = logger.get('ruleExecution');
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

  public async logStatusChange(args: LogStatusChangeArgs): Promise<void> {
    const { newStatus, message, ruleId, ruleName, ruleType, spaceId } = args;

    try {
      const truncatedMessage = message ? truncateMessage(message) : message;
      await this.client.logStatusChange({
        ...args,
        message: truncatedMessage,
      });
    } catch (e) {
      const logMessage = 'Error logging rule execution status change';
      const logAttributes = `status: "${newStatus}", rule id: "${ruleId}", rule name: "${ruleName}"`;
      const logReason = e instanceof Error ? `${e.stack}` : `${e}`;
      const logMeta: ExtMeta = {
        rule: {
          id: ruleId,
          name: ruleName,
          type: ruleType,
          execution: {
            status: newStatus,
          },
        },
        kibana: {
          spaceId,
        },
      };

      this.logger.error<ExtMeta>(`${logMessage}; ${logAttributes}; ${logReason}`, logMeta);
    }
  }
}
