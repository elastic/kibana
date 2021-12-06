/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { bulkAction, queryOrUndefined, bulkActionUpdate } from '../common/schemas';

export const performBulkActionSchema = t.exact(
  t.intersection([
    t.type({
      query: queryOrUndefined,
      action: bulkAction,
    }),
    t.partial({ updates: t.array(bulkActionUpdate) }),
  ])
);

export type PerformBulkActionSchema = t.TypeOf<typeof performBulkActionSchema>;
