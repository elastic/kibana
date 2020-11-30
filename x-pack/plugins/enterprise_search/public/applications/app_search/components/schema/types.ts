/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type SchemaTypes = 'text' | 'number' | 'geolocation' | 'date';

export interface Schema {
  [key: string]: SchemaTypes;
}

// this is a mapping of schema field types ("string", "number", "geolocation", "date") to the names
// of source engines which utilize that type
export type SchemaConflictFieldTypes = {
  [key in SchemaTypes]: string[];
};

export interface SchemaConflict {
  fieldTypes: SchemaConflictFieldTypes;
  resolution?: string;
}

// For now these values are ISchemaConflictFieldTypes, but in the near future will be ISchemaConflict
// once we implement schema conflict resolution
export interface SchemaConflicts {
  [key: string]: SchemaConflictFieldTypes;
}

export interface IndexingStatus {
  percentageComplete: number;
  numDocumentsWithErrors: number;
  activeReindexJobId: number;
}
