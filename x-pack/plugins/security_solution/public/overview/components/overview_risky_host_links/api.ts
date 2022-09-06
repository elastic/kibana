/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup } from '@kbn/core/public';

interface CreateIngestPipeline {
  http: HttpSetup;
  signal?: AbortSignal;
  spaceId?: string;
  options: { name: string; processors: Array<Record<string, unknown>> };
}

interface DeleteIngestPipeline {
  http: HttpSetup;
  signal?: AbortSignal;
  spaceId?: string;
  names: string;
}

interface CreateIndices {
  http: HttpSetup;
  signal?: AbortSignal;
  spaceId?: string;
  options: { index: string; mappings: Record<string, unknown> };
}

interface DeleteIndices {
  http: HttpSetup;
  signal?: AbortSignal;
  spaceId?: string;
  options: { indices: string[] };
}

interface CreateTransforms {
  http: HttpSetup;
  signal?: AbortSignal;
  spaceId?: string;
  transformId: string;
  options: Record<string, unknown>;
}

interface StartTransforms {
  http: HttpSetup;
  signal?: AbortSignal;
  spaceId?: string;
  transformIds: string[];
}

interface StopTransforms {
  http: HttpSetup;
  signal?: AbortSignal;
  spaceId?: string;
  transformIds: string[];
}

interface GetTransformState {
  http: HttpSetup;
  signal?: AbortSignal;
  spaceId?: string;
  transformId: string;
}

interface GetTransformsState {
  http: HttpSetup;
  signal?: AbortSignal;
  spaceId?: string;
  transformIds: string[];
}

interface RestartTransforms {
  http: HttpSetup;
  signal?: AbortSignal;
  spaceId?: string;
  transformIds: string[];
}

interface DeleteTransforms {
  http: HttpSetup;
  signal?: AbortSignal;
  spaceId?: string;
  transformIds: string[];
  options: {
    deleteDestIndex?: boolean;
    deleteDestDataView?: boolean;
    forceDelete?: boolean;
  };
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

export async function deleteIngestPipelines({
  http,
  signal,
  spaceId = 'default',
  names, // separate with ','
}: DeleteIngestPipeline) {
  const res = await http.delete(`/api/ingest_pipelines/${names}`, {
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

export async function deleteIndices({ http, signal, spaceId = 'default', options }: DeleteIndices) {
  const res = await http.post('/api/index_management/indices/delete', {
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
  const res = await http.get<{ transforms: Array<{ id: string; state: string }> }>(
    `/api/transform/transforms/${transformId}/_stats`,
    {
      signal,
    }
  );

  return res;
}

export async function getTransformsState({
  http,
  signal,
  spaceId = 'default',
  transformIds,
}: GetTransformsState) {
  const unresolvedPromises: Array<Promise<{ transforms: Array<{ id: string; state: string }> }>> =
    transformIds.map(async (transformId) => {
      const transformState = await getTransformState({
        http,
        signal,
        spaceId,
        transformId,
      });
      return transformState;
    });

  const states = await Promise.all(unresolvedPromises);
  return states;
}

export async function stopTransforms({
  http,
  signal,
  spaceId = 'default',
  transformIds,
}: StopTransforms) {
  const states = await getTransformsState({ http, signal, spaceId, transformIds });
  const res = await http.post(`/api/transform/stop_transforms`, {
    body: JSON.stringify(
      states.map((state) => ({
        id: state.transforms[0].id,
        state: state.transforms[0].state,
      }))
    ),
    signal,
  });

  return res;
}

export async function deleteTransforms({
  http,
  signal,
  spaceId = 'default',
  transformIds,
  options,
}: DeleteTransforms) {
  await stopTransforms({ http, signal, spaceId, transformIds });

  const res = await http.post(`/api/transform/delete_transforms`, {
    body: JSON.stringify({
      ...options,
      transformsInfo: transformIds.map((id) => ({
        id,
        state: 'stopped',
      })),
    }),
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
