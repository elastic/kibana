/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ALERTING_AUDIT_SAVED_OBJECT_TYPE = 'audit';

export enum AlertingAuditLogOperation {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  GET = 'get',
}

export enum AlertingAuditSubject {
  RULE = 'rule',
}

export interface AlertingAuditLog {
  id: string;
  '@timestamp': string;
  user: string;
  operation: AlertingAuditLogOperation;
  subject: string;
  subjectId: string;
}

export interface AlertingAuditSOAttributes {
  operation: string;
}
