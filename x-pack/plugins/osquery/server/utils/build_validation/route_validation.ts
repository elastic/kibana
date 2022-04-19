/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import * as rt from 'io-ts';
import { formatErrors, exactCheck } from '@kbn/securitysolution-io-ts-utils';
import {
  RouteValidationFunction,
  RouteValidationResultFactory,
  RouteValidationError,
} from '@kbn/core/server';
import { excess, GenericIntersectionC } from '../runtime_types';

type RequestValidationResult<T> =
  | {
      value: T;
      error?: undefined;
    }
  | {
      value?: undefined;
      error: RouteValidationError;
    };

export const buildRouteValidation =
  <T extends rt.Mixed, A = rt.TypeOf<T>>(schema: T): RouteValidationFunction<A> =>
  (inputValue: unknown, validationResult: RouteValidationResultFactory) =>
    pipe(
      schema.decode(inputValue),
      (decoded) => exactCheck(inputValue, decoded),
      fold<rt.Errors, A, RequestValidationResult<A>>(
        (errors: rt.Errors) => validationResult.badRequest(formatErrors(errors).join()),
        (validatedInput: A) => validationResult.ok(validatedInput)
      )
    );

export const buildRouteValidationWithExcess =
  <
    T extends rt.InterfaceType<rt.Props> | GenericIntersectionC | rt.PartialType<rt.Props>,
    A = rt.TypeOf<T>
  >(
    schema: T
  ): RouteValidationFunction<A> =>
  (inputValue: unknown, validationResult: RouteValidationResultFactory) =>
    pipe(
      excess(schema).decode(inputValue),
      fold<rt.Errors, A, RequestValidationResult<A>>(
        (errors: rt.Errors) => validationResult.badRequest(formatErrors(errors).join()),
        (validatedInput: A) => validationResult.ok(validatedInput)
      )
    );
