/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingObjectProperty, MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { Required } from 'utility-types';

type AllMappingPropertyType = Required<MappingProperty>['type'];

type StorageMappingPropertyType = AllMappingPropertyType &
  (
    | 'text'
    | 'match_only_text'
    | 'keyword'
    | 'boolean'
    | 'date'
    | 'byte'
    | 'float'
    | 'double'
    | 'long'
    | 'object'
  );

type StorageMappingPropertyObjectType = Required<MappingObjectProperty, 'type'>;

export type StorageMappingProperty =
  | Extract<MappingProperty, { type: Exclude<StorageMappingPropertyType, 'object'> }>
  | StorageMappingPropertyObjectType;

type MappingPropertyOf<TType extends StorageMappingPropertyType> = Extract<
  StorageMappingProperty,
  { type: TType }
>;

type MappingPropertyFactory<
  TType extends StorageMappingPropertyType,
  TDefaults extends Partial<MappingPropertyOf<TType> | undefined>
> = <TOverrides extends Partial<MappingPropertyOf<TType>> | undefined>(
  overrides?: TOverrides
) => MappingPropertyOf<TType> & Exclude<TDefaults, undefined> & Exclude<TOverrides, undefined>;

function createFactory<
  TType extends StorageMappingPropertyType,
  TDefaults extends Partial<MappingPropertyOf<TType>> | undefined
>(type: TType, defaults?: TDefaults): MappingPropertyFactory<TType, TDefaults>;

function createFactory(
  type: StorageMappingPropertyType,
  defaults?: Partial<StorageMappingProperty>
) {
  return (overrides: Partial<StorageMappingProperty>) => {
    return {
      ...defaults,
      ...overrides,
      type,
    };
  };
}

const types = {
  keyword: createFactory('keyword', { ignore_above: 1024 }),
  match_only_text: createFactory('match_only_text'),
  text: createFactory('text'),
  double: createFactory('double'),
  long: createFactory('long'),
  boolean: createFactory('boolean'),
  date: createFactory('date', { format: 'strict_date_optional_time' }),
  byte: createFactory('byte'),
  float: createFactory('float'),
  object: createFactory('object'),
} satisfies {
  [TKey in StorageMappingPropertyType]: MappingPropertyFactory<TKey, any>;
};

type PrimitiveOf<TProperty extends StorageMappingProperty> = {
  keyword: TProperty extends { enum: infer TEnums }
    ? TEnums extends Array<infer TEnum>
      ? TEnum
      : never
    : string;
  match_only_text: string;
  text: string;
  boolean: boolean;
  date: TProperty extends { format: 'strict_date_optional_time' } ? string : string | number;
  double: number;
  long: number;
  byte: number;
  float: number;
  object: TProperty extends { properties: Record<string, StorageMappingProperty> }
    ? {
        [key in keyof TProperty['properties']]?: StorageFieldTypeOf<TProperty['properties'][key]>;
      }
    : object;
}[TProperty['type']];

export type StorageFieldTypeOf<TProperty extends StorageMappingProperty> = PrimitiveOf<TProperty>;

export { types };
