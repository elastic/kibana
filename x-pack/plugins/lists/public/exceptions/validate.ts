/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { exactCheck } from '../../common/siem_common_deps';

export const formatErrors = (errors: t.Errors): string[] => {
  return errors.map((error) => {
    if (error.message != null) {
      return error.message;
    } else {
      const mappedContext = error.context
        .filter(
          (entry) => entry.key != null && !Number.isInteger(+entry.key) && entry.key.trim() !== ''
        )
        .map((entry) => entry.key)
        .join(',');
      return `Invalid value "${error.value}" supplied to "${mappedContext}"`;
    }
  });
};
export const validate = <T extends t.Mixed>(
  obj: object,
  schema: T
): [t.TypeOf<T> | null, string | null] => {
  const decoded = schema.decode(obj);
  const checked = exactCheck(obj, decoded);
  const left = (errors: t.Errors): [T | null, string | null] => [
    null,
    formatErrors(errors).join(','),
  ];
  const right = (output: T): [T | null, string | null] => [output, null];
  return pipe(checked, fold(left, right));
};
