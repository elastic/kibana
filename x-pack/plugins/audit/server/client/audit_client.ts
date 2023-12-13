/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import { CreateAuditData, FindAuditOptions } from '../data/audit';
import { log, find } from '../application/audit/methods';

export interface AuditClientContext {
  savedObjectsRepository: ISavedObjectsRepository;
  logger: Logger;
}

export interface AuditClientConstructorParams {
  readonly logger: Logger;
  readonly savedObjectsRepository: ISavedObjectsRepository;
}

export class AuditClient {
  private readonly context: AuditClientContext;

  constructor(params: AuditClientConstructorParams) {
    this.context = {
      logger: params.logger,
      savedObjectsRepository: params.savedObjectsRepository,
    };
  }

  public log = (data: CreateAuditData) => log(this.context, data);

  public find = (options: FindAuditOptions) => find(this.context, options);
}
