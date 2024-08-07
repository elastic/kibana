/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Required, ValuesType, UnionToIntersection } from 'utility-types';

interface ToolSchemaFragmentBase {
  description?: string;
}

interface ToolSchemaTypeObject extends ToolSchemaFragmentBase {
  type: 'object';
  properties: Record<string, ToolSchemaFragment>;
  required?: string[] | readonly string[];
}

interface ToolSchemaTypeString extends ToolSchemaFragmentBase {
  type: 'string';
  const?: string;
  enum?: string[] | readonly string[];
}

interface ToolSchemaTypeBoolean extends ToolSchemaFragmentBase {
  type: 'boolean';
  const?: string;
  enum?: string[] | readonly string[];
}

interface ToolSchemaTypeNumber extends ToolSchemaFragmentBase {
  type: 'number';
  const?: string;
  enum?: string[] | readonly string[];
}

interface ToolSchemaAnyOf extends ToolSchemaFragmentBase {
  anyOf: ToolSchemaType[];
}

interface ToolSchemaAllOf extends ToolSchemaFragmentBase {
  allOf: ToolSchemaType[];
}

interface ToolSchemaTypeArray extends ToolSchemaFragmentBase {
  type: 'array';
  items: Exclude<ToolSchemaType, ToolSchemaTypeArray>;
}

type ToolSchemaType =
  | ToolSchemaTypeObject
  | ToolSchemaTypeString
  | ToolSchemaTypeBoolean
  | ToolSchemaTypeNumber
  | ToolSchemaTypeArray;

type ToolSchemaFragment = ToolSchemaType | ToolSchemaAnyOf | ToolSchemaAllOf;

type FromToolSchemaObject<TToolSchemaObject extends ToolSchemaTypeObject> = Required<
  {
    [key in keyof TToolSchemaObject['properties']]?: FromToolSchema<
      TToolSchemaObject['properties'][key]
    >;
  },
  TToolSchemaObject['required'] extends string[] | readonly string[]
    ? ValuesType<TToolSchemaObject['required']>
    : never
>;

type FromToolSchemaArray<TToolSchemaObject extends ToolSchemaTypeArray> = Array<
  FromToolSchema<TToolSchemaObject['items']>
>;

type FromToolSchemaString<TToolSchemaString extends ToolSchemaTypeString> =
  TToolSchemaString extends { const: string }
    ? TToolSchemaString['const']
    : TToolSchemaString extends { enum: string[] } | { enum: readonly string[] }
    ? ValuesType<TToolSchemaString['enum']>
    : string;

type FromToolSchemaAnyOf<TToolSchemaAnyOf extends ToolSchemaAnyOf> = FromToolSchema<
  ValuesType<TToolSchemaAnyOf['anyOf']>
>;

type FromToolSchemaAllOf<TToolSchemaAllOf extends ToolSchemaAllOf> = UnionToIntersection<
  FromToolSchema<ValuesType<TToolSchemaAllOf['allOf']>>
>;

export type ToolSchema = ToolSchemaTypeObject;

export type FromToolSchema<TToolSchema extends ToolSchemaFragment> =
  TToolSchema extends ToolSchemaTypeObject
    ? FromToolSchemaObject<TToolSchema>
    : TToolSchema extends ToolSchemaTypeArray
    ? FromToolSchemaArray<TToolSchema>
    : TToolSchema extends ToolSchemaTypeBoolean
    ? boolean
    : TToolSchema extends ToolSchemaTypeNumber
    ? number
    : TToolSchema extends ToolSchemaTypeString
    ? FromToolSchemaString<TToolSchema>
    : TToolSchema extends ToolSchemaAnyOf
    ? FromToolSchemaAnyOf<TToolSchema>
    : TToolSchema extends ToolSchemaAllOf
    ? FromToolSchemaAllOf<TToolSchema>
    : never;
