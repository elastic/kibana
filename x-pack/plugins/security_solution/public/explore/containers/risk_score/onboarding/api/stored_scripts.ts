/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import {
  RISK_SCORE_CREATE_STORED_SCRIPT,
  RISK_SCORE_DELETE_STORED_SCRIPT,
} from '../../../../../../common/constants';
import {
  STORED_SCRIPT_CREATION_ERROR_MESSAGE,
  STORED_SCRIPT_DELETION_ERROR_MESSAGE,
} from './translations';
import type { CreateStoredScript, DeleteStoredScript, DeleteStoredScripts } from './types';

export async function createStoredScript({
  errorMessage,
  http,
  notifications,
  options,
  renderDocLink,
  signal,
  theme,
}: CreateStoredScript) {
  const res = await http
    .put(RISK_SCORE_CREATE_STORED_SCRIPT, {
      body: JSON.stringify(options),
      signal,
    })
    .catch((e) => {
      notifications?.toasts?.addDanger({
        title: errorMessage ?? STORED_SCRIPT_CREATION_ERROR_MESSAGE,
        text: toMountPoint(renderDocLink ? renderDocLink(e?.body?.message) : e?.body?.message, {
          theme$: theme?.theme$,
        }),
      });
    });

  return res;
}

export async function deleteStoredScript({
  errorMessage,
  http,
  notifications,
  options,
  renderDocLink,
  signal,
  theme,
}: DeleteStoredScript) {
  const res = await http
    .delete(RISK_SCORE_DELETE_STORED_SCRIPT, {
      body: JSON.stringify(options),
      signal,
    })
    .catch((e) => {
      notifications?.toasts?.addDanger({
        title: errorMessage ?? STORED_SCRIPT_DELETION_ERROR_MESSAGE,
        text: toMountPoint(renderDocLink ? renderDocLink(e?.body?.message) : e?.body?.message, {
          theme$: theme?.theme$,
        }),
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
      return deleteStoredScript({
        http,
        notifications,
        signal,
        errorMessage,
        options: { id },
      });
    })
  );
  return result;
}
