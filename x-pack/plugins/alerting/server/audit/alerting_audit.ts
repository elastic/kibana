/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPluginStart } from '@kbn/security-plugin/server';
import { KibanaRequest } from '@kbn/core-http-server';
import { AlertingAuditLog, AlertingAuditLogOperation } from '../../common';
import { AlertingAuditClient } from './client/alerting_audit_client';

interface AlertingAuditConstructorParams {
  securityPluginStart?: SecurityPluginStart;
}

interface AlertingAuditContext {
  client: AlertingAuditClient;
  request: KibanaRequest;
}

export interface AlertingAuditLogParams {
  operation: AlertingAuditLogOperation;
  subject: string;
  subjectId: string;
  data: {
    old: unknown;
    new: unknown;
  };
}

export class AlertingAudit {
  private context: AlertingAuditContext | null;
  private securityPluginStart?: SecurityPluginStart;

  constructor(params: AlertingAuditConstructorParams) {
    this.securityPluginStart = params.securityPluginStart;
    this.context = null;
  }

  public setContext(context: AlertingAuditContext) {
    this.context = context;
  }

  public async log(params: AlertingAuditLogParams): Promise<AlertingAuditLog> {
    if (!this.context) {
      throw new Error('No context');
    }
    return this.context.client.log({
      timestamp: new Date().toISOString(),
      user: await this.getUserName(),
      ...params,
    });
  }

  private async getUserName() {
    if (!this.securityPluginStart || !this.context?.request) {
      return '';
    }
    const user = await this.securityPluginStart.authc.getCurrentUser(this.context.request);
    return user ? user.username : '';
  }
}
