/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup, NotificationsStart } from '@kbn/core/public';

export interface CreateIngestPipeline {
  http: HttpSetup;
  errorMessage?: string;
  notifications?: NotificationsStart;
  signal?: AbortSignal;
  options: { name: string; processors: Array<Record<string, unknown>> };
}

export interface DeleteIngestPipeline {
  http: HttpSetup;
  notifications?: NotificationsStart;
  errorMessage?: string;
  signal?: AbortSignal;
  names: string;
}

export interface CreateIndices {
  http: HttpSetup;
  notifications?: NotificationsStart;
  signal?: AbortSignal;
  errorMessage?: string;
  options: { index: string; mappings: Record<string, unknown> };
}

export interface DeleteIndices {
  http: HttpSetup;
  notifications?: NotificationsStart;
  signal?: AbortSignal;
  errorMessage?: string;
  options: { indices: string[] };
}

export interface CreateTransforms {
  http: HttpSetup;
  notifications?: NotificationsStart;
  signal?: AbortSignal;
  errorMessage?: string;
  transformId: string;
  options: Record<string, unknown>;
}

export interface StartTransforms {
  http: HttpSetup;
  notifications?: NotificationsStart;
  signal?: AbortSignal;
  errorMessage?: string;
  transformIds: string[];
}

export interface StopTransforms {
  http: HttpSetup;
  notifications?: NotificationsStart;
  signal?: AbortSignal;
  errorMessage?: string;
  transformIds: string[];
}

export interface GetTransformState {
  http: HttpSetup;
  notifications?: NotificationsStart;
  signal?: AbortSignal;
  errorMessage?: string;
  transformId: string;
}

export interface GetTransformsState {
  http: HttpSetup;
  notifications?: NotificationsStart;
  errorMessage?: string;
  signal?: AbortSignal;
  transformIds: string[];
}

export interface DeleteTransforms {
  http: HttpSetup;
  notifications?: NotificationsStart;
  errorMessage?: string;
  signal?: AbortSignal;
  transformIds: string[];
  options?: {
    deleteDestIndex?: boolean;
    deleteDestDataView?: boolean;
    forceDelete?: boolean;
  };
}
