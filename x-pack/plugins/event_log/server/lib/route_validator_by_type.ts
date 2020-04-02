/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { RouteValidationResultFactory, RouteValidationFunction } from 'kibana/server';
import { Type } from 'io-ts';

export const routeValidatorByType = <T extends Type<any, any, any>>(type: T) => (
  value: any,
  { ok, badRequest }: RouteValidationResultFactory
) => {
  type TypeOf = t.TypeOf<typeof type>;
  // const twemp = type.decode(value)
  return pipe(
    type.decode(value),
    fold<t.Errors, TypeOf, ReturnType<RouteValidationFunction<TypeOf>>>(
      (errors: t.Errors) => badRequest(errors.map(e => `${e.message ?? e.value}`).join('\n')),
      (val: TypeOf) => ok(val)
    )
  );
};
