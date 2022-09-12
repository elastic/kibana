/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RISKY_SCORE_CREATE_STORED_SCRIPT,
  RISKY_SCORE_DELETE_STORED_SCRIPT,
} from '../../../../../../common/constants';
import {
  STORED_SCRIPT_CREATION_ERROR_MESSAGE,
  STORED_SCRIPT_DELETION_ERROR_MESSAGE,
} from './translations';
import type { CreateStoredScript, DeleteStoredScript, DeleteStoredScripts } from './types';

export async function createStoredScript({
  http,
  notifications,
  signal,
  errorMessage,
  options,
}: CreateStoredScript) {
  const res = await http
    .put(RISKY_SCORE_CREATE_STORED_SCRIPT, {
      body: JSON.stringify(options),
      signal,
    })
    .catch((e) => {
      notifications?.toasts?.addDanger({
        title: errorMessage ?? STORED_SCRIPT_CREATION_ERROR_MESSAGE,
        text: e?.body?.message,
      });
    });

  return res;
}

export async function deleteStoredScript({
  http,
  notifications,
  signal,
  errorMessage,
  options,
}: DeleteStoredScript) {
  const res = await http
    .put(RISKY_SCORE_DELETE_STORED_SCRIPT, {
      body: JSON.stringify(options),
      signal,
    })
    .catch((e) => {
      notifications?.toasts?.addDanger({
        title: errorMessage ?? STORED_SCRIPT_DELETION_ERROR_MESSAGE,
        text: e?.body?.message,
      });
    });

  return res;
}

export async function deleteStoredScripts({
  http,
  notifications,
  signal,
  errorMessage,
  ids,
}: DeleteStoredScripts) {
  const result = await Promise.all(
    ids.map((id) => {
      const res = deleteStoredScript({
        http,
        notifications,
        signal,
        errorMessage,
        options: { id },
      });
      return res;
    })
  );
  return result;
}
