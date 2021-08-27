/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { formatErrors } from './format_errors';

interface Message<T> {
  errors: t.Errors;
  schema: T | {};
}

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils/src/test_utils/index.ts
 */
const onLeft = <T>(errors: t.Errors): Message<T> => {
  return { errors, schema: {} };
};

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils/src/test_utils/index.ts
 */
const onRight = <T>(schema: T): Message<T> => {
  return {
    errors: [],
    schema,
  };
};

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils/src/test_utils/index.ts
 */
export const foldLeftRight = fold(onLeft, onRight);

/**
 * Convenience utility to keep the error message handling within tests to be
 * very concise.
 * @param validation The validation to get the errors from
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils/src/test_utils/index.ts
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

/**
 * Convenience utility to remove text appended to links by EUI
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils/src/test_utils/index.ts
 */
export const removeExternalLinkText = (str: string): string =>
  str.replace(/\(opens in a new tab or window\)/g, '');
