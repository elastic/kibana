/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { pipe } from 'fp-ts/pipeable';
import { fold } from 'fp-ts/Either';
import { exactCheck, formatErrors } from '@kbn/securitysolution-io-ts-utils';

import { DataValidationError } from './errors';

/**
 * Validates that some data is valid by using an `io-ts` schema as the validator.
 * Returns either `undefined` if the data is valid, or a `DataValidationError`, which includes
 * a `reason` property with the errors encountered
 * @param validator
 * @param data
 */
export const validateData = <D>(validator: t.Type<D>, data: D): undefined | DataValidationError => {
  return pipe(
    validator.decode(data),
    (decoded) => exactCheck(data, decoded),
    fold(
      (errors: t.Errors) => {
        const errorStrings = formatErrors(errors);

        return new DataValidationError(errorStrings, 400);
      },
      () => undefined
    )
  );
};
