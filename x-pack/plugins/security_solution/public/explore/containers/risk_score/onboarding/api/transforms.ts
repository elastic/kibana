/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GET_TRANSFORM_STATE_ERROR_MESSAGE,
  GET_TRANSFORM_STATE_NOT_FOUND_MESSAGE,
  START_TRANSFORMS_ERROR_MESSAGE,
  STOP_TRANSFORMS_ERROR_MESSAGE,
  TRANSFORM_CREATION_ERROR_MESSAGE,
  TRANSFORM_DELETION_ERROR_MESSAGE,
} from './translations';
import type {
  CreateTransform,
  CreateTransformResult,
  DeleteTransforms,
  DeleteTransformsResult,
  GetTransformsState,
  GetTransformState,
  StartTransforms,
  StartTransformsResult,
  StopTransforms,
  StopTransformsResult,
} from './types';

const TRANSFORM_API_BASE_PATH = `/api/transform`;
const toastLifeTimeMs = 600000;

const getErrorToastMessage = ({
  messageBody,
  renderDocLink,
}: {
  messageBody: string;
  renderDocLink?: (message: string) => React.ReactNode;
}) => (renderDocLink ? (renderDocLink(messageBody) as unknown as string) : messageBody);

export async function createTransform({
  errorMessage,
  http,
  notifications,
  options,
  renderDocLink,
  signal,
  transformId,
}: CreateTransform) {
  const res = await http
    .put<CreateTransformResult>(`${TRANSFORM_API_BASE_PATH}/transforms/${transformId}`, {
      body: JSON.stringify(options),
      signal,
    })
    .then((result) => {
      const { errors } = result;
      const errorMessageTitle = errorMessage ?? TRANSFORM_CREATION_ERROR_MESSAGE;

      if (errors && errors.length > 0) {
        const failedIds = errors?.map<string>(({ id, error }) => {
          if (error?.output?.payload?.cause) {
            return `${id}: ${error?.output?.payload?.cause}`;
          }
          return id;
        }, []);

        notifications?.toasts?.addError(new Error(errorMessageTitle), {
          title: errorMessageTitle,
          toastMessage: getErrorToastMessage({
            messageBody: failedIds.join(', '),
            renderDocLink,
          }),
          toastLifeTimeMs,
        });
      }
      return result;
    })
    .catch((e) => {
      notifications?.toasts?.addError(e, {
        title: errorMessage ?? TRANSFORM_CREATION_ERROR_MESSAGE,
        toastMessage: getErrorToastMessage({ messageBody: e?.body?.message, renderDocLink }),
        toastLifeTimeMs,
      });
    });

  return res;
}

export async function startTransforms({
  http,
  notifications,
  renderDocLink,
  signal,
  errorMessage,
  transformIds,
}: StartTransforms) {
  const res = await http
    .post<StartTransformsResult>(`${TRANSFORM_API_BASE_PATH}/start_transforms`, {
      body: JSON.stringify(
        transformIds.map((id) => ({
          id,
        }))
      ),
      signal,
    })
    .then((result) => {
      const failedIds = Object.entries(result).reduce<string[]>((acc, [key, val]) => {
        return !val.success
          ? [...acc, val?.error?.reason ? `${key}: ${val?.error?.reason}` : key]
          : acc;
      }, []);
      const errorMessageTitle = errorMessage ?? START_TRANSFORMS_ERROR_MESSAGE(failedIds.length);

      if (failedIds.length > 0) {
        notifications?.toasts?.addError(new Error(errorMessageTitle), {
          title: errorMessageTitle,
          toastMessage: getErrorToastMessage({
            messageBody: failedIds.join(', '),
            renderDocLink,
          }),
          toastLifeTimeMs,
        });
      }

      return result;
    })
    .catch((e) => {
      notifications?.toasts?.addError(e, {
        title: errorMessage ?? START_TRANSFORMS_ERROR_MESSAGE(transformIds.length),
        toastMessage: getErrorToastMessage({ messageBody: e?.body?.message, renderDocLink }),
        toastLifeTimeMs,
      });
    });

  return res;
}

export async function getTransformState({
  http,
  notifications,
  renderDocLink,
  signal,
  errorMessage = GET_TRANSFORM_STATE_ERROR_MESSAGE,
  transformId,
}: GetTransformState) {
  const res = await http
    .get<{ transforms: Array<{ id: string; state: string }>; count: number }>(
      `${TRANSFORM_API_BASE_PATH}/transforms/${transformId}/_stats`,
      {
        signal,
      }
    )
    .then((result) => {
      if (result.count === 0) {
        notifications?.toasts?.addError(new Error(errorMessage), {
          title: errorMessage,
          toastMessage: getErrorToastMessage({
            messageBody: `${GET_TRANSFORM_STATE_NOT_FOUND_MESSAGE}: ${transformId}`,
            renderDocLink,
          }),
          toastLifeTimeMs,
        });
      }
      return result;
    })
    .catch((e) => {
      notifications?.toasts?.addError(e, {
        title: errorMessage,
        toastMessage: getErrorToastMessage({ messageBody: e?.body?.message, renderDocLink }),
        toastLifeTimeMs,
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
  errorMessage,
  transformIds,
  renderDocLink,
}: StopTransforms) {
  const states = await getTransformsState({ http, signal, transformIds });
  const res = await http
    .post<StopTransformsResult>(`${TRANSFORM_API_BASE_PATH}/stop_transforms`, {
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
      const failedIds = Object.entries(result).reduce<string[]>((acc, [key, val]) => {
        return !val.success
          ? [...acc, val?.error?.reason ? `${key}: ${val?.error?.reason}` : key]
          : acc;
      }, []);

      const errorMessageTitle = errorMessage ?? STOP_TRANSFORMS_ERROR_MESSAGE(failedIds.length);
      if (failedIds.length > 0) {
        notifications?.toasts?.addError(new Error(errorMessageTitle), {
          title: errorMessageTitle,
          toastMessage: getErrorToastMessage({
            messageBody: failedIds.join(', '),
            renderDocLink,
          }),
          toastLifeTimeMs,
        });
      }

      return result;
    })
    .catch((e) => {
      notifications?.toasts?.addError(e, {
        title: errorMessage ?? STOP_TRANSFORMS_ERROR_MESSAGE(transformIds.length),
        toastMessage: getErrorToastMessage({
          messageBody: e?.body?.message,
          renderDocLink,
        }),
        toastLifeTimeMs,
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
  renderDocLink,
}: DeleteTransforms) {
  await stopTransforms({ http, signal, transformIds });
  const res = await http
    .post<DeleteTransformsResult>(`${TRANSFORM_API_BASE_PATH}/delete_transforms`, {
      body: JSON.stringify({
        transformsInfo: transformIds.map((id) => ({
          id,
          state: 'stopped',
        })),
        ...(options ? options : {}),
      }),
      signal,
    })
    .then((result) => {
      const failedIds = Object.entries(result).reduce<string[]>((acc, [key, val]) => {
        return !val.transformDeleted.success
          ? [
              ...acc,
              val?.transformDeleted?.error?.reason
                ? `${key}: ${val?.transformDeleted?.error?.reason}`
                : key,
            ]
          : acc;
      }, []);
      const errorMessageTitle = errorMessage ?? TRANSFORM_DELETION_ERROR_MESSAGE(failedIds.length);

      if (failedIds.length > 0) {
        notifications?.toasts?.addError(new Error(errorMessageTitle), {
          title: errorMessageTitle,
          toastMessage: getErrorToastMessage({
            messageBody: failedIds.join(', '),
            renderDocLink,
          }),
          toastLifeTimeMs,
        });
      }

      return result;
    })
    .catch((e) => {
      notifications?.toasts?.addError(e, {
        title: errorMessage ?? TRANSFORM_DELETION_ERROR_MESSAGE(transformIds.length),
        toastMessage: getErrorToastMessage({
          messageBody: e?.body?.message,
          renderDocLink,
        }),
        toastLifeTimeMs,
      });
    });

  return res;
}
