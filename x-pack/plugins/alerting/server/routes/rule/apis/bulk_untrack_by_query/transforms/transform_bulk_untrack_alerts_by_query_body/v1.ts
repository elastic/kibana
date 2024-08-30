/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkUntrackByQueryRequestBodyV1 } from '../../../../../schemas/rule/apis/bulk_untrack_by_query';

export const transformBulkUntrackAlertsByQueryBody = ({
  query,
  feature_ids: featureIds,
}: BulkUntrackByQueryRequestBodyV1) => ({
  query,
  featureIds,
});
