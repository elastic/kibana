/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

export const NonEmptyArray = <C extends t.Mixed>(
  codec: C,
  name: string = `NonEmptyArray<${codec.name}>`
) => {
  const arrType = t.array(codec);
  type ArrType = t.TypeOf<typeof arrType>;
  return new t.Type<ArrType, ArrType, unknown>(
    name,
    arrType.is,
    (input, context): Either<t.Errors, ArrType> => {
      if (Array.isArray(input) && input.length === 0) {
        return t.failure(input, context);
      } else {
        return arrType.validate(input, context);
      }
    },
    t.identity
  );
};
