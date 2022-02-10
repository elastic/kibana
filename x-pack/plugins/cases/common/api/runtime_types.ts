/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { either, fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import * as rt from 'io-ts';
import { isObject } from 'lodash/fp';

type ErrorFactory = (message: string) => Error;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils/src/format_errors/index.ts
 * Bug fix for the TODO is in the format_errors package
 */
export const formatErrors = (errors: rt.Errors): string[] => {
  const err = errors.map((error) => {
    if (error.message != null) {
      return error.message;
    } else {
      const keyContext = error.context
        .filter(
          (entry) => entry.key != null && !Number.isInteger(+entry.key) && entry.key.trim() !== ''
        )
        .map((entry) => entry.key)
        .join(',');

      const nameContext = error.context.find((entry) => {
        // TODO: Put in fix for optional chaining https://github.com/cypress-io/cypress/issues/9298
        if (entry.type && entry.type.name) {
          return entry.type.name.length > 0;
        }
        return false;
      });
      const suppliedValue =
        keyContext !== '' ? keyContext : nameContext != null ? nameContext.type.name : '';
      const value = isObject(error.value) ? JSON.stringify(error.value) : error.value;
      return `Invalid value "${value}" supplied to "${suppliedValue}"`;
    }
  });

  return [...new Set(err)];
};

export const createPlainError = (message: string) => new Error(message);

export const throwErrors = (createError: ErrorFactory) => (errors: rt.Errors) => {
  throw createError(formatErrors(errors).join());
};

export const decodeOrThrow =
  <A, O, I>(runtimeType: rt.Type<A, O, I>, createError: ErrorFactory = createPlainError) =>
  (inputValue: I) =>
    pipe(runtimeType.decode(inputValue), fold(throwErrors(createError), identity));

const getExcessProps = (props: rt.Props, r: Record<string, unknown>): string[] => {
  const ex: string[] = [];
  for (const k of Object.keys(r)) {
    if (!Object.prototype.hasOwnProperty.call(props, k)) {
      ex.push(k);
    }
  }
  return ex;
};

export function excess<C extends rt.InterfaceType<rt.Props> | rt.PartialType<rt.Props>>(
  codec: C
): C {
  const r = new rt.InterfaceType(
    codec.name,
    codec.is,
    (i, c) =>
      either.chain(rt.UnknownRecord.validate(i, c), (s: Record<string, unknown>) => {
        const ex = getExcessProps(codec.props, s);
        return ex.length > 0
          ? rt.failure(
              i,
              c,
              `Invalid value ${JSON.stringify(i)} supplied to : ${
                codec.name
              }, excess properties: ${JSON.stringify(ex)}`
            )
          : codec.validate(i, c);
      }),
    codec.encode,
    codec.props
  );
  return r as C;
}
