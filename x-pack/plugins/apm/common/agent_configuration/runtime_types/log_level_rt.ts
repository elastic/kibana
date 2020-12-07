/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

export const logLevelRt = t.union([
  t.literal('trace'),
  t.literal('debug'),
  t.literal('info'),
  t.literal('warning'),
  t.literal('error'),
  t.literal('critical'),
  t.literal('off'),
]);
