/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { AuditClientContext } from '../../../../client';
import { FindAuditOptions, findAuditSo } from '../../../../data/audit';
import { transformAuditSoToAuditLog } from '../../transforms';
import { FindAuditResult } from './types';

export async function find(
  context: AuditClientContext,
  options: FindAuditOptions
): Promise<FindAuditResult> {
  // TODO check Auth

  const { savedObjectsRepository, logger } = context;

  try {
    const result = await findAuditSo({ savedObjectsRepository, options });

    return {
      page: result.page,
      perPage: result.per_page,
      total: result.total,
      data: result.saved_objects.map((so) => transformAuditSoToAuditLog(so)),
    };
  } catch (e) {
    const errorMessage = `Failed to find audit data, Error: ${e}`;
    logger.error(errorMessage);
    throw Boom.boomify(e, { message: errorMessage });
  }
}
