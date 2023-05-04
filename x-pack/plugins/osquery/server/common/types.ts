/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';

export interface IQueryPayload {
  attributes?: {
    name: string;
    id: string;
  };
}

export type SOShard = Array<{ key: string; value: number }>;

export interface PackSavedObjectAttributes {
  name: string;
  description: string | undefined;
  queries: Array<{
    id: string;
    name: string;
    query: string;
    interval: number;
    snapshot?: boolean;
    removed?: boolean;
    ecs_mapping?: Record<string, unknown>;
  }>;
  version?: number;
  enabled: boolean | undefined;
  created_at: string;
  created_by: string | undefined;
  updated_at: string;
  updated_by: string | undefined;
  policy_ids?: string[];
  shards: SOShard;
}

export type PackSavedObject = SavedObject<PackSavedObjectAttributes>;

export interface SavedQuerySavedObjectAttributes {
  id: string;
  description: string | undefined;
  query: string;
  interval: number | string;
  snapshot?: boolean;
  removed?: boolean;
  platform: string;
  ecs_mapping?: Array<Record<string, unknown>>;
  created_at: string;
  created_by: string | undefined;
  updated_at: string;
  updated_by: string | undefined;
}

export type SavedQuerySavedObject = SavedObject<PackSavedObjectAttributes>;

export interface HTTPError extends Error {
  statusCode: number;
}
