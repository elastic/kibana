/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApiToken } from '../credentials/types';
import { Schema, SchemaConflicts, IndexingStatus } from '../schema/types';

export interface Engine {
  name: string;
  type: string;
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
  activeReindexJob?: IndexingStatus;
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
