/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { PositiveInteger, PositiveIntegerGreaterThanZero } from '@kbn/securitysolution-io-ts-types';

const rule = t.type({
  id: t.string,
  name: t.union([t.string, t.undefined]),
});

const error = t.type({
  status_code: PositiveIntegerGreaterThanZero,
  message: t.string,
  rules: t.array(rule),
});

export const bulkActionPartialErrorResponseSchema = t.exact(
  t.type({
    status_code: PositiveIntegerGreaterThanZero,
    message: t.string,
    attributes: t.type({
      errors: t.array(error),
      rules: t.type({
        failed: PositiveInteger,
        succeeded: PositiveInteger,
        total: PositiveInteger,
      }),
    }),
  })
);

export type BulkActionPartialErrorResponse = t.TypeOf<typeof bulkActionPartialErrorResponseSchema>;
