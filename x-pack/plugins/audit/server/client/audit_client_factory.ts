/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import { AuditClient } from './audit_client';

export interface ClientFactoryOpts {
  logger: Logger;
  savedObjectsRepository: ISavedObjectsRepository;
}

export class AuditClientFactory {
  private isInitialized = false;
  private logger!: Logger;
  private savedObjectsRepository!: ISavedObjectsRepository;

  public initialize(options: ClientFactoryOpts) {
    if (this.isInitialized) {
      throw new Error('AuditClientFactory already initialized');
    }
    this.isInitialized = true;
    this.logger = options.logger;
    this.savedObjectsRepository = options.savedObjectsRepository;
  }

  public create() {
    return new AuditClient({
      logger: this.logger,
      savedObjectsRepository: this.savedObjectsRepository,
    });
  }
}
