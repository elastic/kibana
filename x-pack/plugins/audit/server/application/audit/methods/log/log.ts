/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuditLog } from '../../../../../common';
import { AuditClientContext } from '../../../../client';
import { CreateAuditData, createAuditSo } from '../../../../data/audit';

export async function log(context: AuditClientContext, data: CreateAuditData): Promise<AuditLog> {
  // TODO check Auth

  const { savedObjectsRepository, logger } = context;
  const result = await createAuditSo({ savedObjectsRepository, data });

  logger.info('Audit log has been created');

  return {
    id: result.id,
    ...result.attributes,
  };
}
