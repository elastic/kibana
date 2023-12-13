/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FindAuditResponseV1 } from '../../../../../common/routes/audit/response';
import { FindAuditResult } from '../../../../application/audit/methods';

export const transformFindResponse = (result: FindAuditResult): FindAuditResponseV1 => ({
  total: result.total,
  page: result.page,
  per_page: result.perPage,
  data: result.data.map((auditLog) => ({
    ...auditLog,
    subject_id: auditLog.subjectId,
  })),
});
