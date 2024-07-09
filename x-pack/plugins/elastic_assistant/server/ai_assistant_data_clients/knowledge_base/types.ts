/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface EsKnowledgeBaseEntrySchema {
  '@timestamp': string;
  id: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  users?: Array<{
    id?: string;
    name?: string;
  }>;
  metadata?: {
    kbResource: string;
    source: string;
    required: boolean;
  };
  namespace: string;
  text: string;
  vector?: {
    tokens: Record<string, number>;
    model_id: string;
  };
}

export interface CreateKnowledgeBaseEntrySchema {
  '@timestamp'?: string;
  id?: string | undefined;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  users: Array<{
    id?: string;
    name?: string;
  }>;
  metadata?: {
    kbResource: string;
    source: string;
    required: boolean;
  };
  namespace: string;
  text: string;
  vector?: {
    tokens: Record<string, number>;
    model_id: string;
  };
}
