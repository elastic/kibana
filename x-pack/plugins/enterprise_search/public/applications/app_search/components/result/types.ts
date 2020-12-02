/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type Raw = string | string[] | number | number[];
export type Snippet = string;
// Certain API endpoits will use the internal field type names
export type InternalSchemaType = 'string' | 'float' | 'date' | 'location';
// Certain API endpoits will use these external type names, which map to the internal names above
export type ExternalSchemaType = 'text' | 'number' | 'date' | 'geolocation';
export type FieldType = InternalSchemaType | ExternalSchemaType;

// A search result item
export interface Result {
  id: {
    raw: string;
  };
  _meta: object;
  [key: string]: {
    raw?: Raw;
    snippet?: Snippet;
  };
}
