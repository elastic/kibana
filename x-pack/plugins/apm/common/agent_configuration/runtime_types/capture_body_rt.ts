/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

export const captureBodyRt = t.union([
  t.literal('off'),
  t.literal('errors'),
  t.literal('transactions'),
  t.literal('all'),
]);
