/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup, NotificationsStart } from '@kbn/core/public';

interface CreateIngestPipeline {
  http: HttpSetup;
  errorMessage?: string;
  notifications?: NotificationsStart;
  signal?: AbortSignal;
  options: { name: string; processors: Array<Record<string, unknown>> };
}

interface DeleteIngestPipeline {
  http: HttpSetup;
  notifications?: NotificationsStart;
  errorMessage?: string;
  signal?: AbortSignal;
  names: string;
}

interface CreateIndices {
  http: HttpSetup;
  notifications?: NotificationsStart;
  signal?: AbortSignal;
  errorMessage?: string;
  options: { index: string; mappings: Record<string, unknown> };
}

interface DeleteIndices {
  http: HttpSetup;
  notifications?: NotificationsStart;
  signal?: AbortSignal;
  errorMessage?: string;
  options: { indices: string[] };
}

interface CreateTransforms {
  http: HttpSetup;
  notifications?: NotificationsStart;
  signal?: AbortSignal;
  errorMessage?: string;
  transformId: string;
  options: Record<string, unknown>;
}

interface StartTransforms {
  http: HttpSetup;
  notifications?: NotificationsStart;
  signal?: AbortSignal;
  errorMessage?: string;
  transformIds: string[];
}

interface StopTransforms {
  http: HttpSetup;
  notifications?: NotificationsStart;
  signal?: AbortSignal;
  errorMessage?: string;
  transformIds: string[];
}

interface GetTransformState {
  http: HttpSetup;
  signal?: AbortSignal;
  errorMessage?: string;
  transformId: string;
}

interface GetTransformsState {
  http: HttpSetup;
  errorMessage?: string;
  signal?: AbortSignal;
  transformIds: string[];
}

interface RestartTransforms {
  http: HttpSetup;
  notifications?: NotificationsStart;
  errorMessage?: string;
  signal?: AbortSignal;
  transformIds: string[];
}

interface DeleteTransforms {
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

const INDEX_MANAGEMENT_API_BASE_PATH = `/api/index_management`;
const INGEST_PIPELINES_API_BASE_PATH = `/api/ingest_pipelines`;
const TRANSFORM_API_BASE_PATH = `/api/transform`;

export async function createIngestPipeline({
  http,
  notifications,
  signal,
  errorMessage,
  options,
}: CreateIngestPipeline) {
  const res = await http
    .post(INGEST_PIPELINES_API_BASE_PATH, {
      body: JSON.stringify(options),
      signal,
    })
    .catch((e) => {
      notifications?.toasts?.addDanger({
        title: errorMessage ?? 'Ingest pipeline creation failed',
        text: e?.body?.message,
      });
    });

  return res;
}

export async function deleteIngestPipelines({
  http,
  notifications,
  signal,
  errorMessage,
  names, // separate with ','
}: DeleteIngestPipeline) {
  const res = await http
    .delete(`${INGEST_PIPELINES_API_BASE_PATH}/${names}`, {
      signal,
    })
    .catch((e) => {
      notifications?.toasts?.addDanger({
        title: errorMessage ?? 'Failed to delete index',
        text: e?.body?.message,
      });
    });

  return res;
}

export async function createIndices({
  http,
  notifications,
  signal,
  errorMessage,
  options,
}: CreateIndices) {
  const res = await http
    .put(`${INDEX_MANAGEMENT_API_BASE_PATH}/indices/create`, {
      body: JSON.stringify(options),
      signal,
    })
    .catch((e) => {
      notifications?.toasts?.addDanger({
        title: errorMessage ?? 'Failed to create index',
        text: e?.body?.message,
      });
    });

  return res;
}

export async function deleteIndices({
  http,
  notifications,
  signal,
  errorMessage,
  options,
}: DeleteIndices) {
  const res = await http
    .post(`${INDEX_MANAGEMENT_API_BASE_PATH}/indices/delete`, {
      body: JSON.stringify(options),
      signal,
    })
    .catch((e) => {
      notifications?.toasts?.addDanger({
        title: errorMessage ?? 'Failed to delete indices',
        text: e?.body?.message,
      });
    });

  return res;
}

export async function createTransform({
  http,
  notifications,
  signal,
  errorMessage,
  transformId,
  options,
}: CreateTransforms) {
  const res = await http
    .put(`${TRANSFORM_API_BASE_PATH}/transforms/${transformId}`, {
      body: JSON.stringify(options),
      signal,
    })
    .catch((e) => {
      notifications?.toasts?.addDanger({
        title: errorMessage ?? 'Failed to create Transform',
        text: e?.body?.message,
      });
    });

  return res;
}

export async function startTransforms({
  http,
  notifications,
  signal,
  errorMessage,
  transformIds,
}: StartTransforms) {
  const res = await http
    .post(`${TRANSFORM_API_BASE_PATH}/start_transforms`, {
      body: JSON.stringify(
        transformIds.map((id) => ({
          id,
        }))
      ),
      signal,
    })
    .catch((e) => {
      notifications?.toasts?.addDanger({
        title: errorMessage ?? 'Failed to start Transforms',
        text: e?.body?.message,
      });
    });

  return res;
}

export async function getTransformState({
  http,
  signal,
  errorMessage,
  transformId,
}: GetTransformState) {
  const res = await http.get<{ transforms: Array<{ id: string; state: string }> }>(
    `${TRANSFORM_API_BASE_PATH}/transforms/${transformId}/_stats`,
    {
      signal,
    }
  );

  return res;
}

export async function getTransformsState({
  http,
  signal,
  errorMessage,
  transformIds,
}: GetTransformsState) {
  const states = await Promise.all(
    transformIds.map((transformId) => {
      const transformState = getTransformState({
        http,
        signal,
        transformId,
      });
      return transformState;
    })
  );
  return states;
}

export async function stopTransforms({
  http,
  notifications,
  signal,
  errorMessage,
  transformIds,
}: StopTransforms) {
  const states = await getTransformsState({ http, signal, transformIds });
  const res = await http
    .post(`${TRANSFORM_API_BASE_PATH}/stop_transforms`, {
      body: JSON.stringify(
        states.reduce(
          (acc, state) =>
            state.transforms.length > 0
              ? [
                  ...acc,
                  {
                    id: state.transforms[0].id,
                    state: state.transforms[0].state,
                  },
                ]
              : acc,
          [] as Array<{ id: string; state: string }>
        )
      ),
      signal,
    })
    .catch((e) => {
      notifications?.toasts?.addDanger({
        title: errorMessage ?? 'Failed to stop Transforms',
        text: e?.body?.message,
      });
    });

  return res;
}

export async function deleteTransforms({
  http,
  notifications,
  signal,
  errorMessage,
  transformIds,
  options,
}: DeleteTransforms) {
  await stopTransforms({ http, signal, transformIds });

  const res = await http
    .post(`${TRANSFORM_API_BASE_PATH}/delete_transforms`, {
      body: JSON.stringify({
        transformsInfo: transformIds.map((id) => ({
          id,
          state: 'stopped',
        })),
        ...(options ? options : {}),
      }),
      signal,
    })
    .catch((e) => {
      notifications?.toasts?.addDanger({
        title: errorMessage ?? 'Failed to delete Transforms',
        text: e?.body?.message,
      });
    });

  return res;
}

export async function restartTransforms({
  http,
  notifications,
  signal,
  errorMessage,
  transformIds,
}: RestartTransforms) {
  await stopTransforms({
    http,
    notifications,
    signal,
    errorMessage,
    transformIds,
  });

  const res = await startTransforms({
    http,
    notifications,
    signal,
    errorMessage,
    transformIds,
  });

  return res;
}
