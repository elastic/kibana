/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GET_TRANSFORM_STATE_ERROR_MESSAGE,
  START_TRANSFORMS_ERROR_MESSAGE,
  STOP_TRANSFORMS_ERROR_MESSAGE,
  TRANSFORM_CREATION_ERROR_MESSAGE,
  TRANSFORM_DELETION_ERROR_MESSAGE,
} from './translations';
import type {
  CreateTransforms,
  DeleteTransforms,
  GetTransformsState,
  GetTransformState,
  RestartTransforms,
  StartTransforms,
  StopTransforms,
} from './types';

const TRANSFORM_API_BASE_PATH = `/api/transform`;

export async function createTransform({
  http,
  notifications,
  signal,
  errorMessage,
  transformId,
  options,
}: CreateTransforms) {
  const res = await http
    .put<{ errors: unknown[]; transformsCreated: Array<{}> }>(
      `${TRANSFORM_API_BASE_PATH}/transforms/${transformId}`,
      {
        body: JSON.stringify(options),
        signal,
      }
    )
    .then((result) => {
      const { errors } = result;
      if (errors.length > 0) {
        notifications?.toasts?.addDanger(errorMessage ?? TRANSFORM_CREATION_ERROR_MESSAGE);
      }
    })
    .catch((e) => {
      notifications?.toasts?.addDanger({
        title: errorMessage ?? TRANSFORM_CREATION_ERROR_MESSAGE,
        text: e?.body?.message,
      });
    });

  return res;
}

export async function startTransforms({
  http,
  notifications,
  signal,
  callback,
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
    .then((result) => {
      if (callback) {
        callback(result);
      }
    })
    .catch((e) => {
      notifications?.toasts?.addDanger({
        title: errorMessage ?? START_TRANSFORMS_ERROR_MESSAGE(transformIds.length),
        text: e?.body?.message,
      });
    });

  return res;
}

export async function getTransformState({
  http,
  notifications,
  signal,
  errorMessage,
  transformId,
}: GetTransformState) {
  const res = await http
    .get<{ transforms: Array<{ id: string; state: string }> }>(
      `${TRANSFORM_API_BASE_PATH}/transforms/${transformId}/_stats`,
      {
        signal,
      }
    )
    .catch((e) => {
      notifications?.toasts?.addDanger({
        title: errorMessage ?? GET_TRANSFORM_STATE_ERROR_MESSAGE,
        text: e?.body?.message,
      });
    });

  return res;
}

export async function getTransformsState({
  http,
  notifications,
  signal,
  errorMessage,
  transformIds,
}: GetTransformsState) {
  const states = await Promise.all(
    transformIds.map((transformId) => {
      const transformState = getTransformState({
        http,
        notifications,
        signal,
        errorMessage,
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
  callback,
  errorMessage,
  transformIds,
}: StopTransforms) {
  const states = await getTransformsState({ http, signal, transformIds });
  const res = await http
    .post(`${TRANSFORM_API_BASE_PATH}/stop_transforms`, {
      body: JSON.stringify(
        states.reduce(
          (acc, state) =>
            state != null && state.transforms.length > 0
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
    .then((result) => {
      if (callback) {
        callback(result);
      }
    })
    .catch((e) => {
      notifications?.toasts?.addDanger({
        title: errorMessage ?? STOP_TRANSFORMS_ERROR_MESSAGE(transformIds.length),
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
        title: errorMessage ?? TRANSFORM_DELETION_ERROR_MESSAGE(transformIds.length),
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
