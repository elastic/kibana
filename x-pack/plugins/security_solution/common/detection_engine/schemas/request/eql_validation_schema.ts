/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

import { index, query } from '../common/schemas';

export const eqlValidationSchema = t.exact(
  t.type({
    index,
    query,
  })
);

export type EqlValidationSchema = t.TypeOf<typeof eqlValidationSchema>;
