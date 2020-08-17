/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

import { _index } from '../common/schemas';

export const createEsBulkTypeSchema = t.exact(
  t.type({
    create: t.exact(t.type({ _index })),
  })
);

export type CreateEsBulkTypeSchema = t.OutputOf<typeof createEsBulkTypeSchema>;
