/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

const afterKeySchema = t.record(t.string, t.string);
export type AfterKeySchema = t.TypeOf<typeof afterKeySchema>;
export type AfterKey = AfterKeySchema;

export const afterKeysSchema = t.exact(
  t.partial({
    host: afterKeySchema,
    user: afterKeySchema,
  })
);
export type AfterKeysSchema = t.TypeOf<typeof afterKeysSchema>;
export type AfterKeys = AfterKeysSchema;
