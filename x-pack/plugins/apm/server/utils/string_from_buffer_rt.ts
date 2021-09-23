/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';

export const stringFromBufferRt = new t.Type<string, Buffer, unknown>(
  'stringFromBufferRt',
  t.string.is,
  (input, context) => {
    return Buffer.isBuffer(input)
      ? t.success(input.toString('utf-8'))
      : t.failure(input, context, 'Input is not a Buffer');
  },
  (str) => {
    return Buffer.from(str);
  }
);
