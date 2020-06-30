/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { either } from 'fp-ts/lib/Either';
import { getRangeTypeMessage } from './get_range_type_message';

export function getIntegerRt({
  min = -Infinity,
  max = Infinity,
}: {
  min?: number;
  max?: number;
} = {}) {
  const message = getRangeTypeMessage(min, max);

  return new t.Type<string, string, unknown>(
    'integerRt',
    t.string.is,
    (input, context) => {
      return either.chain(
        t.string.validate(input, context),
        (inputAsString) => {
          const inputAsInt = parseInt(inputAsString, 10);
          const isValid = inputAsInt >= min && inputAsInt <= max;
          return isValid
            ? t.success(inputAsString)
            : t.failure(input, context, message);
        }
      );
    },
    t.identity
  );
}
