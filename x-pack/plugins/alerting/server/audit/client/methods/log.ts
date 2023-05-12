/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';
import {
  ALERTING_AUDIT_SAVED_OBJECT_TYPE,
  AlertingAuditSOAttributes,
  AlertingAuditLog,
  AlertingAuditLogOperation,
} from '../../../../common';
import { AlertingAuditClientContext } from '../alerting_audit_client';

export interface AlertingAuditLogParams {
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

export async function log(
  context: AlertingAuditClientContext,
  params: AlertingAuditLogParams
): Promise<AlertingAuditLog> {
  const id = SavedObjectsUtils.generateId();

  const result = await context.savedObjectsClient.create<AlertingAuditSOAttributes>(
    ALERTING_AUDIT_SAVED_OBJECT_TYPE,
    {
      ...params,
    },
    {
      id,
    }
  );

  return {
    id: result.id,
    ...result.attributes,
  } as AlertingAuditLog;
}
