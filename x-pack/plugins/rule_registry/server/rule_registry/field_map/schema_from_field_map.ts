/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import { ObjectType, schema, Type, TypeOf } from '@kbn/config-schema';
import { FieldMap } from '../types';

type MaybeArrayType<T, TOptions extends { array?: boolean }> = TOptions extends { array: true }
  ? T[]
  : T;

type MaybeRequiredType<
  T,
  TOptions extends { required?: boolean; array?: boolean }
> = TOptions extends {
  required: true;
}
  ? MaybeArrayType<T, TOptions>
  : MaybeArrayType<T, TOptions> | undefined | null;

const map = {
  keyword: schema.string(),
  text: schema.string(),
  date: schema.string(),
  boolean: schema.boolean(),
  byte: schema.number(),
  long: schema.number(),
  integer: schema.number(),
  short: schema.number(),
  double: schema.number(),
  float: schema.number(),
  scaled_float: schema.number(),
  unsigned_long: schema.number(),
  flattened: schema.mapOf(schema.string(), schema.arrayOf(schema.string())),
};

type SchemaMap = typeof map;

type TypeOfField<T extends { required?: boolean; array?: boolean; type: string }> = Type<
  MaybeRequiredType<
    (Record<string, unknown> &
      {
        [key in keyof SchemaMap]: TypeOf<SchemaMap[key]>;
      })[T['type']],
    T
  >
>;

export type SchemaOf<TFieldMap extends FieldMap> = ObjectType<
  {
    [key in keyof TFieldMap]: TypeOfField<TFieldMap[key]>;
  }
>;

export function schemaFromFieldMap<TFieldMap extends FieldMap>(fieldMap: TFieldMap) {
  return (schema.object(
    mapValues(fieldMap, ({ type, array, required }) => {
      let schemaType: Type<any> = type in map ? map[type as keyof SchemaMap] : schema.never();

      if (array) {
        schemaType = schema.arrayOf(schemaType);
      }

      if (!required) {
        schemaType = schema.maybe(schemaType);
      }

      return schemaType;
    })
  ) as unknown) as SchemaOf<TFieldMap>;
}
