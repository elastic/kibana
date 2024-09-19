/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BulkAction } from '../common/schemas';
import { PerformBulkActionSchema } from './perform_bulk_action_schema';

export const getPerformBulkActionSchemaMock = (): PerformBulkActionSchema => ({
  query: '',
  action: BulkAction.disable,
});
