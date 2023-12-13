/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const AUDIT_SAVED_OBJECT_TYPE = 'audit';
export const AUDIT_FIND_PATH = '/api/audit/_find';

export enum AuditLogOperation {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  GET = 'get',
}

export enum AuditSubject {
  RULE = 'rule',
}
