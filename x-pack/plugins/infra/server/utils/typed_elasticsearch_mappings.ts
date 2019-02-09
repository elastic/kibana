/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type ElasticsearchMappingOf<Type> = Type extends string
  ? ElasticsearchStringFieldMapping
  : Type extends number
  ? ElasticsearchNumberFieldMapping
  : Type extends {}
  ? ElasticsearchObjectFieldMapping<Type>
  : never;

export interface ElasticsearchStringFieldMapping {
  type: 'keyword' | 'text';
}

export interface ElasticsearchNumberFieldMapping {
  type:
    | 'long'
    | 'integer'
    | 'short'
    | 'byte'
    | 'double'
    | 'float'
    | 'half_float'
    | 'scaled_float'
    | 'date';
}

export interface ElasticsearchObjectFieldMapping<Obj extends {}> {
  type?: 'object';
  properties: { [K in keyof Obj]-?: ElasticsearchMappingOf<Obj[K]> };
}
