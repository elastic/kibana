/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core/server';

export interface IQueryPayload {
  attributes?: {
    name: string;
    id: string;
  };
}

export interface PackSavedObjectAttributes {
  name: string;
  description: string | undefined;
  queries: Array<{
    id: string;
    name: string;
    interval: number;
    ecs_mapping: Record<string, unknown>;
  }>;
  version?: number;
  enabled: boolean | undefined;
  created_at: string;
  created_by: string | undefined;
  updated_at: string;
  updated_by: string | undefined;
}

export type PackSavedObject = SavedObject<PackSavedObjectAttributes>;
