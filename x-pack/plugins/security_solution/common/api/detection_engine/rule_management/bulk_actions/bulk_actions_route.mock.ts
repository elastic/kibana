/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BulkActionType, BulkActionEditType } from './bulk_actions_route';
import type { PerformBulkActionRequestBody } from './bulk_actions_route';

export const getPerformBulkActionSchemaMock = (): PerformBulkActionRequestBody => ({
  query: '',
  ids: undefined,
  action: BulkActionType.disable,
});

export const getPerformBulkActionEditSchemaMock = (): PerformBulkActionRequestBody => ({
  query: '',
  ids: undefined,
  action: BulkActionType.edit,
  [BulkActionType.edit]: [{ type: BulkActionEditType.add_tags, value: ['tag1'] }],
});
