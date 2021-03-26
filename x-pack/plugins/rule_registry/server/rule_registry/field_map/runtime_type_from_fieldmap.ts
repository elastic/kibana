/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues, pickBy } from 'lodash';
import * as t from 'io-ts';
import { PickByValueExact } from 'utility-types';
import { FieldMap } from '../types';

const esFieldTypeMap = {
  keyword: t.string,
  text: t.string,
  date: t.string,
  boolean: t.boolean,
  byte: t.number,
  long: t.number,
  integer: t.number,
  short: t.number,
  double: t.number,
  float: t.number,
  scaled_float: t.number,
  unsigned_long: t.number,
  flattened: t.record(t.string, t.array(t.string)),
};

type EsFieldTypeMap = typeof esFieldTypeMap;

type EsFieldTypeOf<T extends string> = T extends keyof EsFieldTypeMap
  ? EsFieldTypeMap[T]
  : t.UnknownC;

type RequiredKeysOf<T extends Record<string, { required?: boolean }>> = keyof PickByValueExact<
  {
    [key in keyof T]: T[key]['required'];
  },
  true
>;

type IntersectionTypeOf<
  T extends Record<string, { required?: boolean; type: t.Any }>
> = t.IntersectionC<
  [
    t.TypeC<Pick<{ [key in keyof T]: T[key]['type'] }, RequiredKeysOf<T>>>,
    t.PartialC<{ [key in keyof T]: T[key]['type'] }>
  ]
>;

type MapTypeValues<T extends FieldMap> = {
  [key in keyof T]: {
    required: T[key]['required'];
    type: T[key]['array'] extends true
      ? t.ArrayC<EsFieldTypeOf<T[key]['type']>>
      : EsFieldTypeOf<T[key]['type']>;
  };
};
export type FieldMapType<T extends FieldMap> = IntersectionTypeOf<MapTypeValues<T>>;

export type TypeOfFieldMap<T extends FieldMap> = t.TypeOf<FieldMapType<T>>;

export function runtimeTypeFromFieldMap<TFieldMap extends FieldMap>(
  fieldMap: TFieldMap
): FieldMapType<TFieldMap> {
  function mapToType(fields: FieldMap) {
    return mapValues(fields, (field) => {
      const type =
        field.type in esFieldTypeMap
          ? esFieldTypeMap[field.type as keyof EsFieldTypeMap]
          : t.unknown;

      return field.array ? t.array(type) : type;
    });
  }

  const required = pickBy(fieldMap, (field) => field.required);

  return (t.intersection([
    t.exact(t.partial(mapToType(fieldMap))),
    t.type(mapToType(required)),
  ]) as unknown) as FieldMapType<TFieldMap>;
}
