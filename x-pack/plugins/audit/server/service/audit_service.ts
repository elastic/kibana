/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPluginStart } from '@kbn/security-plugin/server';
import { KibanaRequest } from '@kbn/core-http-server';
import { AuditLog } from '../../common';
import { AuditServiceConstructorParams, AuditServiceContext, AuditServiceLogParams } from './types';

export class AuditService {
  private context: AuditServiceContext;
  private readonly securityPluginStart?: SecurityPluginStart;
  private readonly namespace: string;

  constructor(params: AuditServiceConstructorParams) {
    this.securityPluginStart = params.securityPluginStart;
    this.context = params.context;
    this.namespace = params.namespace;
  }

  public async log(params: AuditServiceLogParams): Promise<AuditLog | void> {
    try {
      return this.context.client.log({ namespace: this.namespace, ...params });
    } catch (e) {
      this.context.logger.info("Audit log couldn't be saved");
    }
  }

  public async getUserName(request: KibanaRequest) {
    if (!this.securityPluginStart) {
      return '';
    }
    const user = await this.securityPluginStart.authc.getCurrentUser(request);
    return user ? user.username : '';
  }
}
