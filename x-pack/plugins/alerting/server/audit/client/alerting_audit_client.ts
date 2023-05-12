/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { log, find, FindResult, AlertingAuditLogParams, AlertingAuditFindParams } from './methods';
import { AlertingAuditLog } from '../../../common';

export interface AlertingAuditClientContext {
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
}

export interface AlertingAuditClientConstructorOptions {
  readonly logger: Logger;
  readonly savedObjectsClient: SavedObjectsClientContract;
}

export class AlertingAuditClient {
  private readonly context: AlertingAuditClientContext;

  constructor(options: AlertingAuditClientConstructorOptions) {
    this.context = {
      logger: options.logger,
      savedObjectsClient: options.savedObjectsClient,
    };
  }

  public log = (params: AlertingAuditLogParams): Promise<AlertingAuditLog> =>
    log(this.context, params);

  public find = (params: AlertingAuditFindParams): Promise<FindResult> =>
    find(this.context, params);
}
