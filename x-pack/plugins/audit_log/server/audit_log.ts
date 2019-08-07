/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Type } from '@kbn/config-schema';
import { IAuditLog } from './types';

import { Logger } from '../../../../src/core/server';

interface AuditLogCreationOptions {
  id: string;
  recordSchema: Type<Record<string, any>>;
  logger: Logger;
}

export class AuditLog implements IAuditLog {
  private id: string;
  private recordSchema: Type<Record<string, any>>;
  private logger: Logger;

  constructor(options: AuditLogCreationOptions) {
    this.id = options.id;
    this.logger = options.logger;
    this.recordSchema = options.recordSchema;
  }

  async log(record: any) {
    try {
      this.recordSchema.validate(record);
    } catch (err) {
      this.logger.error(`audit_log log() method passed invalid data: ${err.message}`);
      return;
    }

    // TODO: eventually, this will add a saved object to ES
    this.logger.info(`audit_log: ${this.id}: ${JSON.stringify(record)}`);
  }

  async search() {
    // TODO: eventually, this return a search over saved objects
    return [];
  }
}
