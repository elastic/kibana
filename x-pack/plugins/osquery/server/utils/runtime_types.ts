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
import { failure } from 'io-ts/lib/PathReporter';
import get from 'lodash/get';

type ErrorFactory = (message: string) => Error;

export type GenericIntersectionC =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | rt.IntersectionC<[any, any]>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | rt.IntersectionC<[any, any, any]>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | rt.IntersectionC<[any, any, any, any]>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | rt.IntersectionC<[any, any, any, any, any]>;

export const createPlainError = (message: string) => new Error(message);

export const throwErrors = (createError: ErrorFactory) => (errors: rt.Errors) => {
  throw createError(failure(errors).join('\n'));
};

export const decodeOrThrow =
  <A, O, I>(runtimeType: rt.Type<A, O, I>, createError: ErrorFactory = createPlainError) =>
  (inputValue: I) =>
    pipe(runtimeType.decode(inputValue), fold(throwErrors(createError), identity));

const getProps = (
  codec:
    | rt.HasProps
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    | rt.RecordC<rt.StringC, any>
    | GenericIntersectionC
): rt.Props | null => {
  if (codec == null) {
    return null;
  }
  switch (codec._tag) {
    case 'DictionaryType': {
      if (codec.codomain.props != null) {
        return codec.codomain.props;
      }
      const dTypes: rt.HasProps[] = codec.codomain.types;
      return dTypes.reduce<rt.Props>((props, type) => Object.assign(props, getProps(type)), {});
    }
    case 'RefinementType':
    case 'ReadonlyType':
      return getProps(codec.type);
    case 'InterfaceType':
    case 'StrictType':
    case 'PartialType':
      return codec.props;
    case 'IntersectionType': {
      const iTypes = codec.types as rt.HasProps[];
      return iTypes.reduce<rt.Props>(
        (props, type) => Object.assign(props, getProps(type) as rt.Props),
        {} as rt.Props
      ) as rt.Props;
    }
    default:
      return null;
  }
};

const getExcessProps = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: rt.Props | rt.RecordC<rt.StringC, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  r: any
): string[] =>
  Object.keys(r).reduce<string[]>((acc, k) => {
    const codecChildren = get(props, [k]);
    const childrenProps = getProps(codecChildren);
    const childrenObject = r[k] as Record<string, unknown>;
    if (codecChildren != null && childrenProps != null && codecChildren._tag === 'DictionaryType') {
      const keys = Object.keys(childrenObject);
      return [
        ...acc,
        ...keys.reduce<string[]>(
          (kAcc, i) => [...kAcc, ...getExcessProps(childrenProps, childrenObject[i])],
          []
        ),
      ];
    }
    if (codecChildren != null && childrenProps != null) {
      return [...acc, ...getExcessProps(childrenProps, childrenObject)];
    } else if (codecChildren == null) {
      return [...acc, k];
    }
    return acc;
  }, []);

export const excess = <
  C extends rt.InterfaceType<rt.Props> | GenericIntersectionC | rt.PartialType<rt.Props>
>(
  codec: C
): C => {
  const codecProps = getProps(codec);

  const r = new rt.InterfaceType(
    codec.name,
    codec.is,
    (i, c) =>
      either.chain(rt.UnknownRecord.validate(i, c), (s) => {
        if (codecProps == null) {
          return rt.failure(i, c, 'unknown codec');
        }
        const ex = getExcessProps(codecProps, s);

        return ex.length > 0
          ? rt.failure(
              i,
              c,
              `Invalid value ${JSON.stringify(i)}, excess properties: ${JSON.stringify(ex)}`
            )
          : codec.validate(i, c);
      }),
    codec.encode,
    codecProps
  );
  return r as C;
};
