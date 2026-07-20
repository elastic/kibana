/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';

/**
 * Faithful zod equivalent of io-ts's `toBooleanRt`, used by client URL routes
 * (io-ts -> zod migration, elastic/kibana#243355).
 *
 * Unlike `@kbn/zod-helpers`' `BooleanFromString` (which only accepts the exact
 * strings `'true'`/`'false'` or a boolean), `toBooleanRt` never failed on a
 * primitive: any string other than `'true'` — including `''`, which several
 * routes use as a query default — decoded to `false`, and a missing value
 * decoded to `false` too. Route defaults and existing bookmarked URLs rely on
 * that leniency, so preserve it here rather than rejecting those inputs.
 */
export const toBooleanFromString = z.preprocess(
  (value) => (typeof value === 'string' ? value === 'true' : Boolean(value)),
  z.boolean()
);
