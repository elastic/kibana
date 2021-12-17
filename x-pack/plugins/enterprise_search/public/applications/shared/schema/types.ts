/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Schema types
 */

export enum SchemaType {
  Text = 'text',
  Number = 'number',
  Geolocation = 'geolocation',
  Date = 'date',
}
// Certain API endpoints will use these internal type names, which map to the external names above
export enum InternalSchemaType {
  String = 'string',
  Float = 'float',
  Location = 'location',
  Date = 'date',
}

export type Schema = Record<string, SchemaType>;

/**
 * Schema conflict types
 */

// This is a mapping of schema field types ("text", "number", "geolocation", "date")
// to the names of source engines which utilize that type
export type SchemaConflictFieldTypes = Partial<Record<SchemaType, string[]>>;

export interface SchemaConflict {
  fieldTypes: SchemaConflictFieldTypes;
  resolution?: string;
}

// For now these values are SchemaConflictFieldTypes, but in the near future will be SchemaConflict
// once we implement schema conflict resolution
export type SchemaConflicts = Record<string, SchemaConflictFieldTypes>;

/**
 * Indexing job / errors types
 */

export interface IIndexingStatus {
  percentageComplete: number;
  numDocumentsWithErrors: number;
  activeReindexJobId: string;
}

export interface IndexJob extends IIndexingStatus {
  isActive?: boolean;
  hasErrors?: boolean;
}

export interface FieldCoercionError {
  id: string;
  error: string;
}
export type FieldCoercionErrors = Record<string, FieldCoercionError[]>;
