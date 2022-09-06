/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup } from '@kbn/core/public';

export interface CreateIngestPipeline {
  http: HttpSetup;
  signal?: AbortSignal;
  spaceId?: string;
  options: { name: string; processors: Array<Record<string, unknown>> };
}

export interface CreateIndices {
  http: HttpSetup;
  signal?: AbortSignal;
  spaceId?: string;
  options: { index: string; mappings: Record<string, unknown> };
}

export interface CreateTransforms {
  http: HttpSetup;
  signal?: AbortSignal;
  spaceId?: string;
  transformId: string;
  options: Record<string, unknown>;
}

export interface StartTransforms {
  http: HttpSetup;
  signal?: AbortSignal;
  spaceId?: string;
  transformIds: string[];
}

export interface StopTransforms {
  http: HttpSetup;
  signal?: AbortSignal;
  spaceId?: string;
  transformIds: string[];
}

export interface GetTransformState {
  http: HttpSetup;
  signal?: AbortSignal;
  spaceId?: string;
  transformId: string;
}

export interface RestartTransforms {
  http: HttpSetup;
  signal?: AbortSignal;
  spaceId?: string;
  transformIds: string[];
}

export async function createIngestPipeline({
  http,
  signal,
  spaceId = 'default',
  options,
}: CreateIngestPipeline) {
  const res = await http.post(`/api/ingest_pipelines`, {
    body: JSON.stringify(options),
    signal,
  });

  return res;
}

export async function createIndices({ http, signal, spaceId = 'default', options }: CreateIndices) {
  const res = await http.put('/api/index_management/indices/create', {
    body: JSON.stringify(options),
    signal,
  });

  return res;
}

export async function createTransform({
  http,
  signal,
  spaceId = 'default',
  transformId,
  options,
}: CreateTransforms) {
  const res = await http.put(`/api/transform/transforms/${transformId}`, {
    body: JSON.stringify(options),
    signal,
  });

  return res;
}

export async function startTransforms({
  http,
  signal,
  spaceId = 'default',
  transformIds,
}: StartTransforms) {
  const res = await http.post(`/api/transform/start_transforms`, {
    body: JSON.stringify(
      transformIds.map((id) => ({
        id,
      }))
    ),
    signal,
  });

  return res;
}

export async function getTransformState({
  http,
  signal,
  spaceId = 'default',
  transformId,
}: GetTransformState) {
  const res = await http.get(`/api/transform/transforms/${transformId}/_stats`, {
    signal,
  });

  return res;
}

export async function stopTransforms({
  http,
  signal,
  spaceId = 'default',
  transformIds,
}: StopTransforms) {
  transformIds.map(async (transformId) => {
    const { id, state } = await getTransformState({
      http,
      signal,
      spaceId,
      transformId,
    });
    return { id, state };
  });
  const res = await http.post(`/api/transform/start_transforms`, {
    body: JSON.stringify(
      transformIds.map((id) => ({
        id,
        state,
      }))
    ),
    signal,
  });

  return res;
}

export async function restartTransforms({
  http,
  signal,
  spaceId = 'default',
  transformIds,
}: RestartTransforms) {
  await stopTransforms({
    http,
    signal,
    spaceId,
    transformIds,
  });

  const res = await startTransforms({
    http,
    signal,
    spaceId,
    transformIds,
  });

  return res;
}
