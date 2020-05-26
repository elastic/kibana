/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import * as rt from 'io-ts';
import { formatErrors } from '../../../common/format_errors';
import { exactCheck } from '../../../common/exact_check';
import {
  RouteValidationFunction,
  RouteValidationResultFactory,
  RouteValidationError,
} from '../../../../../../src/core/server';

type RequestValidationResult<T> =
  | {
      value: T;
      error?: undefined;
    }
  | {
      value?: undefined;
      error: RouteValidationError;
    };

export const buildRouteValidation = <T extends rt.Mixed, A = rt.TypeOf<T>>(
  schema: T
): RouteValidationFunction<A> => (
  inputValue: unknown,
  validationResult: RouteValidationResultFactory
) =>
  pipe(
    schema.decode(inputValue),
    (decoded) => exactCheck(inputValue, decoded),
    fold<rt.Errors, A, RequestValidationResult<A>>(
      (errors: rt.Errors) => validationResult.badRequest(formatErrors(errors).join()),
      (validatedInput: A) => validationResult.ok(validatedInput)
    )
  );
