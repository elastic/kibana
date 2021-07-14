/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { either } from 'fp-ts/lib/Either';
import * as t from 'io-ts';

export const stringFromBufferRt = new t.Type<string, Buffer, unknown>(
  'toSourceMapRt',
  t.string.is,
  (input, context) => {
    return either.chain(
      t.unknown.validate(input, context),
      (inputAsUnknown) => {
        const inputAsString = (inputAsUnknown as Buffer).toString();
        return inputAsString
          ? t.success(inputAsString)
          : t.failure(input, context, 'could not parse buffer to string');
      }
    );
  },
  (str) => {
    return Buffer.from(str);
  }
);
