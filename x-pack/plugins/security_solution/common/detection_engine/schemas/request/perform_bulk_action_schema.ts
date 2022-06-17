/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { NonEmptyArray, DefaultEmptyString } from '@kbn/securitysolution-io-ts-types';
import { BulkAction, queryOrUndefined, bulkActionEditPayload } from '../common/schemas';

export const performBulkActionSchema = t.intersection([
  t.exact(
    t.type({
      query: queryOrUndefined,
    })
  ),
  t.exact(t.partial({ ids: NonEmptyArray(t.string) })),
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
        [BulkAction.edit]: NonEmptyArray(bulkActionEditPayload),
      })
    ),
  ]),
]);

export const performBulkActionQuerySchema = t.exact(
  t.partial({
    dry_run: t.union([t.literal('true'), t.literal('false')]),
  })
);

export type PerformBulkActionSchema = t.TypeOf<typeof performBulkActionSchema>;
