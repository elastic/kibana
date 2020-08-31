/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { formatErrors } from './format_errors';

interface Message<T> {
  errors: t.Errors;
  schema: T | {};
}

const onLeft = <T>(errors: t.Errors): Message<T> => {
  return { schema: {}, errors };
};

const onRight = <T>(schema: T): Message<T> => {
  return {
    schema,
    errors: [],
  };
};

export const foldLeftRight = fold(onLeft, onRight);

/**
 * Convenience utility to keep the error message handling within tests to be
 * very concise.
 * @param validation The validation to get the errors from
 */
export const getPaths = <A>(validation: t.Validation<A>): string[] => {
  return pipe(
    validation,
    fold(
      (errors) => formatErrors(errors),
      () => ['no errors']
    )
  );
};
