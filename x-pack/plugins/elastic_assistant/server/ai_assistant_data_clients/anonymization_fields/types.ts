/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface SearchEsAnonymizationFieldsSchema {
  id: string;
  '@timestamp': string;
  created_at: string;
  created_by: string;
  field: string;
  default_allow_replacement?: boolean;
  default_allow?: boolean;
  users?: Array<{
    id?: string;
    name?: string;
  }>;
  updated_at?: string;
  updated_by?: string;
  namespace: string;
}

export interface UpdateAnonymizationFieldSchema {
  id: string;
  '@timestamp'?: string;
  default_allow_replacement?: boolean;
  default_allow?: boolean;
  users?: Array<{
    id?: string;
    name?: string;
  }>;
  updated_at?: string;
  updated_by?: string;
}

export interface CreateAnonymizationFieldSchema {
  '@timestamp'?: string;
  field: string;
  default_allow_replacement?: boolean;
  default_allow?: boolean;
  users?: Array<{
    id?: string;
    name?: string;
  }>;
  updated_at?: string;
  updated_by?: string;
  created_at?: string;
  created_by?: string;
}
