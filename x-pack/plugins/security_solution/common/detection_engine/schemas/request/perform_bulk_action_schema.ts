/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { BulkAction, queryOrUndefined, bulkActionEditPayload } from '../common/schemas';

export const performBulkActionSchema = t.intersection([
  t.exact(
    t.type({
      query: queryOrUndefined,
    })
  ),
  t.exact(t.partial({ ids: t.array(t.string) })),
  t.union([
    t.exact(
      t.type({
        action: t.union([
          t.literal(BulkAction.delete),
          t.literal(BulkAction.disable),
          t.literal(BulkAction.duplicate),
          t.literal(BulkAction.enable),
          t.literal(BulkAction.export),
        ]),
      })
    ),
    t.exact(
      t.type({
        action: t.literal(BulkAction.edit),
        [BulkAction.edit]: t.array(bulkActionEditPayload),
      })
    ),
  ]),
]);

export type PerformBulkActionSchema = t.TypeOf<typeof performBulkActionSchema>;
