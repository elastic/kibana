/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

export const eqlValidationSchema = t.exact(
  t.type({
    valid: t.boolean,
    errors: t.array(t.string),
  })
);

export type EqlValidationSchema = t.TypeOf<typeof eqlValidationSchema>;
