/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INDICES_CREATION_ERROR_MESSAGE, INDICES_DELETION_ERROR_MESSAGE } from './translations';
import type { CreateIndices, DeleteIndices } from './types';
const INDEX_MANAGEMENT_API_BASE_PATH = `/api/index_management`;

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
        title: errorMessage ?? INDICES_CREATION_ERROR_MESSAGE,
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
  const count = options.indices.length;
  const res = await http
    .post(`${INDEX_MANAGEMENT_API_BASE_PATH}/indices/delete`, {
      body: JSON.stringify(options),
      signal,
    })
    .catch((e) => {
      notifications?.toasts?.addDanger({
        title: errorMessage ?? INDICES_DELETION_ERROR_MESSAGE(count),
        text: e?.body?.message,
      });
    });

  return res;
}
