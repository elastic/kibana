/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  RouteValidationFunction,
  RouteValidationResultFactory,
  RouteValidationError,
} from '@kbn/core/server';
import { either, fold } from 'fp-ts/lib/Either';
import get from 'lodash/get';
import { pipe } from 'fp-ts/lib/pipeable';
import { formatErrors } from '@kbn/securitysolution-io-ts-utils';
import * as rt from 'io-ts';

type RequestValidationResult<T> =
  | {
      value: T;
      error?: undefined;
    }
  | {
      value?: undefined;
      error: RouteValidationError;
    };

export const buildRouteValidationWithExcess =
  <
    T extends
      | rt.InterfaceType<rt.Props>
      | GenericIntersectionC
      | rt.PartialType<rt.Props>
      | rt.ExactC<any>,
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

export type GenericIntersectionC =
  | rt.IntersectionC<[any, any]>
  | rt.IntersectionC<[any, any, any]>
  | rt.IntersectionC<[any, any, any, any]>
  | rt.IntersectionC<[any, any, any, any, any]>;

export const excess = <
  C extends
    | rt.InterfaceType<rt.Props>
    | GenericIntersectionC
    | rt.PartialType<rt.Props>
    | rt.ExactC<any>
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

const getExcessProps = (
  props: rt.Props | rt.RecordC<rt.StringC, any>,

  r: any
): string[] => {
  return Object.keys(r).reduce<string[]>((acc, k) => {
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
};

const getProps = (
  codec: rt.HasProps | rt.RecordC<rt.StringC, any> | GenericIntersectionC | rt.ExactType<any>
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
    case 'ExactType':
      return getProps(codec.type);
    case 'InterfaceType':
    case 'PartialType':
      return codec.props;
    case 'IntersectionType': {
      const iTypes = codec.types as rt.HasProps[];
      return iTypes.reduce<rt.Props>((props, type) => {
        const typeProps = getProps(type);
        return Object.assign(props, typeProps);
      }, {});
    }

    default:
      return null;
  }
};
