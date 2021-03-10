/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Schema, SchemaConflicts, IIndexingStatus } from '../../../shared/types';
import { ApiToken } from '../credentials/types';

export enum EngineTypes {
  default,
  indexed,
  meta,
}
export interface Engine {
  name: string;
  type: EngineTypes;
  language: string | null;
  result_fields: {
    [key: string]: ResultField;
  };
}

export interface EngineDetails extends Engine {
  created_at: string;
  document_count: number;
  field_count: number;
  unsearchedUnconfirmedFields: boolean;
  apiTokens: ApiToken[];
  apiKey: string;
  schema: Schema;
  schemaConflicts?: SchemaConflicts;
  unconfirmedFields?: string[];
  activeReindexJob?: IIndexingStatus;
  invalidBoosts: boolean;
  sample?: boolean;
  isMeta: boolean;
  engine_count?: number;
  includedEngines?: EngineDetails[];
}

interface ResultField {
  raw: object;
  snippet?: {
    size: number;
    fallback: boolean;
  };
}
