/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Schema, SchemaConflicts, IIndexingStatus } from '../../../shared/schema/types';
import { ApiToken } from '../credentials/types';

export enum EngineTypes {
  default = 'default',
  indexed = 'indexed',
  meta = 'meta',
  elasticsearch = 'elasticsearch',
}
export interface Engine {
  name: string;
  type: EngineTypes;
  language: string | null;
  result_fields: {
    [key: string]: ResultField;
  };
}

interface CurationSuggestionDetails {
  count: number;
  pending: number;
  applied: number;
  automated: number;
  rejected: number;
  disabled: number;
  last_updated: string;
}

interface SearchRelevanceSuggestionDetails {
  count: number;
  curation: CurationSuggestionDetails;
}

export interface EngineDetails extends Engine {
  created_at: string;
  document_count: number;
  field_count: number;
  unsearchedUnconfirmedFields: boolean;
  apiTokens: ApiToken[];
  apiKey: string;
  elasticsearchIndexName?: string;
  schema: Schema;
  schemaConflicts?: SchemaConflicts;
  unconfirmedFields?: string[];
  activeReindexJob?: IIndexingStatus;
  invalidBoosts: boolean;
  sample?: boolean;
  isMeta: boolean;
  engine_count?: number;
  includedEngines?: EngineDetails[];
  adaptive_relevance_suggestions?: SearchRelevanceSuggestionDetails;
  adaptive_relevance_suggestions_active: boolean;
}

interface ResultField {
  raw: object;
  snippet?: {
    size: number;
    fallback: boolean;
  };
}
