/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FindAuditBodyV1 } from '../../../../../common/routes/audit/apis/find';

export const transformFindRequest = ({
  per_page: perPage,
  sort_field: sortField,
  sort_order: sortOrder,
  ...rest
}: FindAuditBodyV1) => ({
  ...rest,
  perPage,
  sortField,
  sortOrder,
});
