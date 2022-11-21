/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Optional } from 'utility-types';
import { mapValues, pickBy } from 'lodash';
import { either } from 'fp-ts/lib/Either';
import * as t from 'io-ts';
import { FieldMap } from './types';

const NumberFromString = new t.Type(
  'NumberFromString',
  (u): u is number => typeof u === 'number',
  (u, c) =>
    either.chain(t.string.validate(u, c), (s) => {
      const d = Number(s);
      return isNaN(d) ? t.failure(u, c) : t.success(d);
    }),
  (a) => a
);

const BooleanFromString = new t.Type(
  'BooleanFromString',
  (u): u is boolean => typeof u === 'boolean',
  (u, c) =>
    either.chain(t.string.validate(u, c), (s) => {
      switch (s.toLowerCase().trim()) {
        case '1':
        case 'true':
        case 'yes':
          return t.success(true);
        case '0':
        case 'false':
        case 'no':
        case null:
          return t.success(false);
        default:
          return t.failure(u, c);
      }
    }),
  (a) => a
);

const esFieldTypeMap = {
  keyword: t.string,
  version: t.string,
  text: t.string,
  date: t.string,
  boolean: t.union([t.number, BooleanFromString]),
  byte: t.union([t.number, NumberFromString]),
  long: t.union([t.number, NumberFromString]),
  integer: t.union([t.number, NumberFromString]),
  short: t.union([t.number, NumberFromString]),
  double: t.union([t.number, NumberFromString]),
  float: t.union([t.number, NumberFromString]),
  scaled_float: t.union([t.number, NumberFromString]),
  unsigned_long: t.union([t.number, NumberFromString]),
  flattened: t.UnknownRecord,
};

type EsFieldTypeMap = typeof esFieldTypeMap;

type EsFieldTypeOf<T extends string> = T extends keyof EsFieldTypeMap
  ? EsFieldTypeMap[T]
  : t.UnknownC;

type CastArray<T extends t.Type<any>> = t.Type<
  t.TypeOf<T> | Array<t.TypeOf<T>>,
  Array<t.TypeOf<T>>,
  unknown
>;
type CastSingle<T extends t.Type<any>> = t.Type<
  t.TypeOf<T> | Array<t.TypeOf<T>>,
  t.TypeOf<T>,
  unknown
>;

const createCastArrayRt = <T extends t.Type<any>>(type: T): CastArray<T> => {
  const union = t.union([type, t.array(type)]);

  return new t.Type('castArray', union.is, union.validate, (a) => (Array.isArray(a) ? a : [a]));
};

const createCastSingleRt = <T extends t.Type<any>>(type: T): CastSingle<T> => {
  const union = t.union([type, t.array(type)]);

  return new t.Type('castSingle', union.is, union.validate, (a) => (Array.isArray(a) ? a[0] : a));
};

type SetOptional<T extends FieldMap> = Optional<
  T,
  {
    [key in keyof T]: T[key]['required'] extends true ? never : key;
  }[keyof T]
>;

type OutputOfField<T extends { type: string; array?: boolean }> = T['array'] extends true
  ? Array<t.OutputOf<EsFieldTypeOf<T['type']>>>
  : t.OutputOf<EsFieldTypeOf<T['type']>>;

type TypeOfField<T extends { type: string; array?: boolean }> =
  | t.TypeOf<EsFieldTypeOf<T['type']>>
  | Array<t.TypeOf<EsFieldTypeOf<T['type']>>>;

type OutputOf<T extends FieldMap> = {
  [key in keyof T]: OutputOfField<Exclude<T[key], undefined>>;
};

type TypeOf<T extends FieldMap> = {
  [key in keyof T]: TypeOfField<Exclude<T[key], undefined>>;
};

export type TypeOfFieldMap<T extends FieldMap> = TypeOf<SetOptional<T>>;
export type OutputOfFieldMap<T extends FieldMap> = OutputOf<SetOptional<T>>;

export type FieldMapType<T extends FieldMap> = t.Type<TypeOfFieldMap<T>, OutputOfFieldMap<T>>;

function valueToIoTs(value: FieldMap): t.Mixed {
  const valueType: string = value.type;
  switch (valueType) {
    case 'boolean':
      return t.boolean;
    case 'keyword':
    case 'text':
    case 'date':
      return t.string;
    case 'byte':
    case 'double':
    case 'float':
    case 'integer':
    case 'long':
    case 'short':
      return t.number;
    case 'array':
      if ('items' in value) {
        return t.array(schemaValueToIoTs((value as SchemaArray<unknown, unknown>).items));
      }
      throw new Error(`Schema type must include the "items" declaration.`);
    default:
      throw new Error(`Unsupported schema type ${valueType}.`);
  }

  if ('properties' in value) {
    const { DYNAMIC_KEY, ...properties } = value.properties as SchemaObject<Value>['properties'] & {
      DYNAMIC_KEY?: SchemaValue<unknown>;
    };
    const schemas: t.Mixed[] = [schemaObjectToIoTs<Record<string, unknown>>({ properties })];
    if (DYNAMIC_KEY) {
      schemas.push(t.record(t.string, schemaValueToIoTs(DYNAMIC_KEY)));
    }
    return isOneOfCandidate(schemas) ? t.union(schemas) : schemas[0];
  } else {
    const valueType = value.type; // Copied in here because of TS reasons, it's not available in the `default` case
    switch (valueType) {
      case 'boolean':
        return t.boolean;
      case 'keyword':
      case 'text':
      case 'date':
        return t.string;
      case 'byte':
      case 'double':
      case 'float':
      case 'integer':
      case 'long':
      case 'short':
        return t.number;
      case 'array':
        if ('items' in value) {
          return t.array(schemaValueToIoTs((value as SchemaArray<unknown, unknown>).items));
        }
        throw new Error(`Schema type must include the "items" declaration.`);
      default:
        throw new Error(`Unsupported schema type ${valueType}.`);
    }
  }
}

function entriesToObjectIoTs(entries: FieldMap): Record<string, t.Mixed> {
  const fields = Object.keys(entries).map((key: string) => {
    const value = entries[key];
    try {
      return [key, valueToIoTs(value)];
    } catch (err) {
      err.failedKey = [key, ...(err.failedKey || [])];
      throw err;
    }
  });
}

export function fieldMapToIoTs(fieldMap: FieldMap): t.Type<Record<string, unknown>> {
  try {
    const requiredFields: FieldMap = pickBy(fieldMap, (field) => field.required === true);
    const optionalFields: FieldMap = pickBy(fieldMap, (field) => field.required === false);

    return t.intersection([
      t.interface(entriesToObjectIoTs(requiredFields)),
      t.partial(entriesToObjectIoTs(optionalFields)),
    ]) as unknown as FieldMapType<TFieldMap>;
  } catch (err) {
    throw error;
  }
  function mapToType(fields: FieldMap) {
    return mapValues(fields, (field) => {
      const type =
        field.type in esFieldTypeMap
          ? esFieldTypeMap[field.type as keyof EsFieldTypeMap]
          : t.unknown;

      return field.array ? createCastArrayRt(type) : createCastSingleRt(type);
    });
  }

  const required = pickBy(fieldMap, (field) => field.required);
  return t.intersection([
    t.exact(t.partial(mapToType(fieldMap))),
    t.type(mapToType(required)),
  ]) as unknown as FieldMapType<TFieldMap>;
}
