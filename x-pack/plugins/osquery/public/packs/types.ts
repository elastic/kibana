/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObject } from 'kibana/server';

export interface IQueryPayload {
  attributes?: {
    name: string;
    id: string;
  };
}

export type PackSavedObject = SavedObject<{
  name: string;
  description: string | undefined;
  queries: Array<Record<string, any>>;
  enabled: boolean | undefined;
  created_at: string;
  created_by: string | undefined;
  updated_at: string;
  updated_by: string | undefined;
}>;
