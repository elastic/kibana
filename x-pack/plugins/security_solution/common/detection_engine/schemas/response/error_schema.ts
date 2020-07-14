/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

/* eslint-disable @typescript-eslint/camelcase */
import { rule_id, status_code, message } from '../common/schemas';
/* eslint-enable @typescript-eslint/camelcase */

// We use id: t.string intentionally and _never_ the id from global schemas as
// sometimes echo back out the id that the user gave us and it is not guaranteed
// to be a UUID but rather just a string
const partial = t.exact(t.partial({ id: t.string, rule_id }));
const required = t.exact(
  t.type({
    error: t.type({
      status_code,
      message,
    }),
  })
);

export const errorSchema = t.intersection([partial, required]);
export type ErrorSchema = t.TypeOf<typeof errorSchema>;
