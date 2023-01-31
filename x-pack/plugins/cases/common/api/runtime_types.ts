/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { either, fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';

import type { JsonArray, JsonObject, JsonValue } from '@kbn/utility-types';
import { formatErrors } from '@kbn/securitysolution-io-ts-utils';

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
  throw createError(formatErrors(errors).join());
};

export const decodeOrThrow =
  <A, O, I>(runtimeType: rt.Type<A, O, I>, createError: ErrorFactory = createPlainError) =>
  (inputValue: I) =>
    pipe(runtimeType.decode(inputValue), fold(throwErrors(createError), identity));

export const getTypeProps = (
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
    case 'DictionaryType':
      if (codec.codomain.props != null) {
        return codec.codomain.props;
      }
      const dTypes: rt.HasProps[] = codec.codomain.types;
      return dTypes.reduce<rt.Props>((props, type) => Object.assign(props, getTypeProps(type)), {});
    case 'RefinementType':
    case 'ReadonlyType':
      return getTypeProps(codec.type);
    case 'InterfaceType':
    case 'StrictType':
    case 'PartialType':
      return codec.props;
    case 'IntersectionType':
      const iTypes = codec.types as rt.HasProps[];
      return iTypes.reduce<rt.Props>((props, type) => {
        return Object.assign(props, getTypeProps(type) as rt.Props);
      }, {} as rt.Props) as rt.Props;
    default:
      return null;
  }
};

const getExcessProps = (props: rt.Props, r: Record<string, unknown>): string[] => {
  const ex: string[] = [];
  for (const k of Object.keys(r)) {
    if (!Object.prototype.hasOwnProperty.call(props, k)) {
      ex.push(k);
    }
  }
  return ex;
};

export function excess<
  C extends rt.InterfaceType<rt.Props> | GenericIntersectionC | rt.PartialType<rt.Props>
>(codec: C): C {
  const codecProps = getTypeProps(codec);

  const r = new rt.InterfaceType(
    codec.name,
    codec.is,
    (i, c) =>
      either.chain(rt.UnknownRecord.validate(i, c), (s: Record<string, unknown>) => {
        if (codecProps == null) {
          return rt.failure(i, c, 'unknown codec');
        }

        const ex = getExcessProps(codecProps, s);
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
    codecProps
  );
  return r as C;
}

export const jsonScalarRt = rt.union([rt.null, rt.boolean, rt.number, rt.string]);

export const jsonValueRt: rt.Type<JsonValue> = rt.recursion('JsonValue', () =>
  rt.union([jsonScalarRt, jsonArrayRt, jsonObjectRt])
);

export const jsonArrayRt: rt.Type<JsonArray> = rt.recursion('JsonArray', () =>
  rt.array(jsonValueRt)
);

export const jsonObjectRt: rt.Type<JsonObject> = rt.recursion('JsonObject', () =>
  rt.record(rt.string, jsonValueRt)
);

type Type = rt.InterfaceType<rt.Props> | GenericIntersectionC;

export const getTypeForCertainFields = (type: Type, fields: string[] = []): Type => {
  if (fields.length === 0) {
    return type;
  }

  const codecProps = getTypeProps(type) ?? {};
  const typeProps: rt.Props = {};

  for (const field of fields) {
    if (codecProps[field]) {
      typeProps[field] = codecProps[field];
    }
  }

  return rt.type(typeProps);
};

export const getTypeForCertainFieldsFromArray = (
  type: rt.ArrayType<Type>,
  fields: string[] = []
): rt.ArrayType<Type> => {
  if (fields.length === 0) {
    return type;
  }

  return rt.array(getTypeForCertainFields(type.type, fields));
};
