/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import { auditLog, auditLogOperation } from './schemas';

type AuditLogSchemaType = TypeOf<typeof auditLog>;
type AuditLogOperationSchemaType = TypeOf<typeof auditLogOperation>;

export interface AuditLog {
  namespace: AuditLogSchemaType['namespace'];
  id: AuditLogSchemaType['id'];
  '@timestamp': AuditLogSchemaType['@timestamp'];
  user: AuditLogSchemaType['user'];
  operation: AuditLogOperationSchemaType;
  subject: AuditLogSchemaType['subject'];
  subjectId: AuditLogSchemaType['subjectId'];
  data: AuditLogSchemaType['data'];
}

export enum AuditDiffOperation {
  ADD = 'add',
  DELETE = 'delete',
  UPDATE = 'update',
  MOVE = 'move',
}
