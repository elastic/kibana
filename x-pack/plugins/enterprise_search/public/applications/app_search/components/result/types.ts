/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InternalSchemaTypes, SchemaTypes } from '../../../shared/types';

export type FieldType = InternalSchemaTypes | SchemaTypes;

export type Raw = string | string[] | number | number[];
export type Snippet = string;
export interface FieldValue {
  raw?: Raw;
  snippet?: Snippet;
}

export interface ResultMeta {
  id: string;
  score?: number;
  engine: string;
}

// A search result item
export type Result = {
  id: {
    raw: string;
  };
  _meta: ResultMeta;
} & {
  // this should be a FieldType object, but there's no good way to do that in TS: https://github.com/microsoft/TypeScript/issues/17867
  // You'll need to cast it to FieldValue whenever you use it.
  [key: string]: object;
};
