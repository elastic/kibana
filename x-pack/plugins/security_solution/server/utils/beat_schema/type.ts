/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * BEAT Interface
 *
 */

export interface SchemaFields {
  default_field: boolean;
  default_fields: boolean;
  definition: string;
  deprecated: string;
  description: string;
  doc_values: boolean;
  example: string | number | object | boolean;
  footnote: string;
  format: string;
  group: number;
  index: boolean;
  ignore_above: number;
  input_format: string;
  level: string;
  migration: boolean;
  multi_fields: object[];
  name: string;
  norms: boolean;
  object_type: string;
  object_type_mapping_type: string;
  output_format: string;
  output_precision: number;
  overwrite: boolean;
  path: string;
  possible_values: string[] | number[];
  release: string;
  required: boolean;
  reusable: object;
  short: string;
  title: string;
  type: string;
  fields: Array<Partial<SchemaFields>>;
}

export interface SchemaItem {
  anchor: string;
  key: string;
  title: string;
  description: string;
  short_config: boolean;
  release: string;
  fields: Array<Partial<SchemaFields>>;
}

export type Schema = Array<Partial<SchemaItem>>;

/*
 * Associative Array Output Interface
 *
 */

export interface RequiredSchemaField {
  description: string;
  example: string | number;
  name: string;
  type: string;
  format: string;
  fields: Readonly<Record<string, Partial<RequiredSchemaField>>>;
}

export type OutputSchema = Readonly<Record<string, Partial<RequiredSchemaField>>>;
