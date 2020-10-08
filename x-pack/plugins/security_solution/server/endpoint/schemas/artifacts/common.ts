/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

export const buffer = new t.Type<Buffer, Buffer, unknown>(
  'buffer',
  (input: unknown): input is Buffer => Buffer.isBuffer(input),
  (input, context) => (Buffer.isBuffer(input) ? t.success(input) : t.failure(input, context)),
  t.identity
);

export const created = t.number;

export const encoding = t.keyof({
  identity: null,
});

export const schemaVersion = t.keyof({
  v1: null,
});
