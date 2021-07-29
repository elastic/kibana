/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { bulkAction, queryOrUndefined } from '../common/schemas';

export const performBulkActionSchema = t.exact(
  t.type({
    query: queryOrUndefined,
    action: bulkAction,
  })
);

export type PerformBulkActionSchema = t.TypeOf<typeof performBulkActionSchema>;
