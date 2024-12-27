/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { merge } from 'lodash';

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
  );

type WithOptions<T extends MappingProperty> = T extends any
  ? T & {
      required?: boolean;
      multi_value?: boolean;
      enum?: string[];
    }
  : never;

export type StorageMappingProperty = WithOptions<
  Extract<MappingProperty, { type: StorageMappingPropertyType }>
>;

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

const baseTypes = {
  keyword: createFactory('keyword', { ignore_above: 1024 }),
  match_only_text: createFactory('match_only_text'),
  text: createFactory('text'),
  double: createFactory('double'),
  long: createFactory('long'),
  boolean: createFactory('boolean'),
  date: createFactory('date', { format: 'strict_date_optional_time' }),
  byte: createFactory('byte'),
  float: createFactory('float'),
} satisfies {
  [TKey in StorageMappingPropertyType]: MappingPropertyFactory<TKey, any>;
};

function enumFactory<
  TEnum extends string,
  TOverrides extends Partial<MappingPropertyOf<'keyword'>> | undefined
>(
  enums: TEnum[],
  overrides?: TOverrides
): MappingPropertyOf<'keyword'> & { enum: TEnum[] } & Exclude<TOverrides, undefined>;

function enumFactory(enums: string[], overrides?: Partial<MappingPropertyOf<'keyword'>>) {
  const nextOverrides = merge({ enum: enums }, overrides);
  const prop = baseTypes.keyword(nextOverrides);
  return prop;
}

const types = {
  ...baseTypes,
  enum: enumFactory,
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
}[TProperty['type']];

type MaybeMultiValue<TProperty extends StorageMappingProperty, TPrimitive> = TProperty extends {
  multi_value: true;
}
  ? TPrimitive[]
  : TPrimitive;
type MaybeRequired<TProperty extends StorageMappingProperty, TPrimitive> = TProperty extends {
  required: true;
}
  ? TPrimitive
  : TPrimitive | undefined;

export type StorageFieldTypeOf<TProperty extends StorageMappingProperty> = MaybeRequired<
  TProperty,
  MaybeMultiValue<TProperty, PrimitiveOf<TProperty>>
>;

export { types };
