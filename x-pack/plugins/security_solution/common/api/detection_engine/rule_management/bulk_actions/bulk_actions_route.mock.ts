/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PerformBulkActionRequestBody } from './bulk_actions_route.gen';
import { BulkActionEditTypeEnum, BulkActionTypeEnum } from './bulk_actions_route.gen';

export const getPerformBulkActionSchemaMock = (): PerformBulkActionRequestBody => ({
  query: '',
  ids: undefined,
  action: BulkActionTypeEnum.disable,
});

export const getPerformBulkActionEditSchemaMock = (): PerformBulkActionRequestBody => ({
  query: '',
  ids: undefined,
  action: BulkActionTypeEnum.edit,
  [BulkActionTypeEnum.edit]: [{ type: BulkActionEditTypeEnum.add_tags, value: ['tag1'] }],
});
