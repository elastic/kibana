/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ALERTING_AUDIT_SAVED_OBJECT_TYPE = 'audit';
export const ALERTING_AUDIT_FIND_PATH = '/api/alerting/audit/_find';

export enum AlertingAuditLogOperation {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  GET = 'get',
}

export enum AlertingAuditSubject {
  RULE = 'rule',
}

export interface AlertingAuditSOAttributes {
  timestamp: string;
  user: string;
  operation: AlertingAuditLogOperation;
  subject: string;
  subjectId: string;
  data: {
    old: unknown;
    new: unknown;
  };
}

export interface AlertingAuditLog extends AlertingAuditSOAttributes {
  id: string;
}

export interface AlertingAuditLogRaw extends Omit<AlertingAuditLog, 'subjectId'> {
  subject_id: string;
}
