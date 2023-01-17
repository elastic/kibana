/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Schema,
  IndexJob,
  SchemaConflicts,
  FieldCoercionErrors,
} from '../../../shared/schema/types';

export interface SchemaApiResponse {
  schema: Schema;
  mostRecentIndexJob: IndexJob;
  unconfirmedFields: string[];
  unsearchedUnconfirmedFields: boolean;
  incompleteFields: string[];
}

export interface MetaEngineSchemaApiResponse {
  schema: Schema;
  fields: SchemaConflicts;
  conflictingFields: SchemaConflicts;
}

export interface ReindexJobApiResponse {
  fieldCoercionErrors: FieldCoercionErrors;
}
