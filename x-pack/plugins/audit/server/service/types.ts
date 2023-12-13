/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { Logger } from '@kbn/logging';
import { AuditLogOperation } from '../../common';
import { AuditClient } from '../client';

export interface AuditServiceConstructorParams {
  securityPluginStart?: SecurityPluginStart;
  context: AuditServiceContext;
  namespace: string;
}

export interface AuditServiceContext {
  client: AuditClient;
  logger: Logger;
}

export interface AuditServiceLogParams {
  user: string;
  operation: AuditLogOperation;
  subject: string;
  subjectId: string;
  data: {
    old: unknown;
    new: unknown;
  };
}
