/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type IndexAlias = 'auditbeat' | 'filebeat' | 'packetbeat' | 'ecs' | 'unknown';

/*
 * BEAT Interface
 *
 */

export interface SchemaFields {
  definition: string;
  description: string;
  doc_values: boolean;
  example: string | number | object;
  footnote: string;
  format: string;
  group: number;
  index: boolean;
  input_format: string;
  level: string;
  migration: boolean;
  multi_fields: object[];
  name: string;
  object_type: string;
  path: string;
  possible_values: string[] | number[];
  release: string;
  required: boolean;
  reusable: object;
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
 * ECS Interface
 *
 */

interface EcsField {
  description: string;
  example: string;
  footnote: string;
  group: number;
  level: string;
  name: string;
  required: boolean;
  type: string;
}

interface EcsNamespace {
  description: string;
  fields: Readonly<Record<string, EcsField>>;
  group: number;
  name: string;
  title: string;
  type: string;
}

export type EcsSchema = Readonly<Record<string, EcsNamespace>>;

/*
 * Associative Array Output Interface
 *
 */

export interface RequiredSchemaField {
  description: string;
  example: string | number;
  name: string;
  type: string;
  fields: Readonly<Record<string, Partial<RequiredSchemaField>>>;
}

export type OutputSchema = Readonly<Record<string, Partial<RequiredSchemaField>>>;
