/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { identity } from 'fp-ts/lib/function';
import { throwErrors } from '../../../infra/common/runtime_types';

export const decodeOrThrow = <A>(
  runtimeType: t.Type<A, any, any>,
  inputValue: any
): A =>
  pipe(
    runtimeType.decode(inputValue),
    fold(
      throwErrors((error) => {
        throw new Error(error);
      }),
      identity
    )
  );
