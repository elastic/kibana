/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

/**
 * Types the DefaultArray<C> as:
 *   - If undefined, then a default array will be set
 *   - If an array is sent in, then the array will be validated to ensure all elements are type C
 */
export const DefaultArray = <C extends t.Mixed>(codec: C) => {
  const arrType = t.array(codec);
  type CodecType = t.TypeOf<typeof arrType>;
  return new t.Type<CodecType, CodecType | undefined, unknown>(
    'DefaultArray',
    t.array(codec).is,
    (input, context): Either<t.Errors, CodecType> =>
      input == null ? t.success([]) : arrType.validate(input, context),
    t.identity
  );
};
