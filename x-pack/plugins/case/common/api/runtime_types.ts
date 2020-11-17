/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { either, fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import * as rt from 'io-ts';
import { failure } from 'io-ts/lib/PathReporter';
import Boom from '@hapi/boom';
import { ContextTypeUserRt, ContextTypeAlertRt } from '.';

type ErrorFactory = (message: string) => Error;

export const createPlainError = (message: string) => new Error(message);

export const throwErrors = (createError: ErrorFactory) => (errors: rt.Errors) => {
  throw createError(failure(errors).join('\n'));
};

export const decodeOrThrow = <A, O, I>(
  runtimeType: rt.Type<A, O, I>,
  createError: ErrorFactory = createPlainError
) => (inputValue: I) =>
  pipe(runtimeType.decode(inputValue), fold(throwErrors(createError), identity));

const getExcessProps = (props: rt.Props, r: Record<string, unknown>): string[] => {
  const ex: string[] = [];
  for (const k of Object.keys(r)) {
    if (!props.hasOwnProperty(k)) {
      ex.push(k);
    }
  }
  return ex;
};

export function excess<C extends rt.InterfaceType<rt.Props>>(codec: C): C {
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
  return r as any;
}

export const decodeComment = (type: string, attributes: unknown) => {
  if (type === 'user') {
    pipe(
      excess(ContextTypeUserRt).decode(attributes),
      fold(throwErrors(Boom.badRequest), identity)
    );
  } else if (type === 'alert') {
    pipe(
      excess(ContextTypeAlertRt).decode(attributes),
      fold(throwErrors(Boom.badRequest), identity)
    );
  }
};
