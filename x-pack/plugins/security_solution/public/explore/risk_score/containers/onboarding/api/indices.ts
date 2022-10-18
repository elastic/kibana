/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { INDICES_CREATION_ERROR_MESSAGE, INDICES_DELETION_ERROR_MESSAGE } from './translations';
import type { CreateIndices, DeleteIndices } from './types';
import {
  RISK_SCORE_CREATE_INDEX,
  RISK_SCORE_DELETE_INDICES,
} from '../../../../../../common/constants';

export async function createIndices({
  errorMessage,
  http,
  notifications,
  options,
  renderDocLink,
  signal,
  theme,
}: CreateIndices) {
  const res = await http
    .put(RISK_SCORE_CREATE_INDEX, {
      body: JSON.stringify(options),
      signal,
    })
    .catch((e) => {
      notifications?.toasts?.addDanger({
        title: errorMessage ?? INDICES_CREATION_ERROR_MESSAGE,
        text: toMountPoint(
          renderDocLink && e?.body?.message != null
            ? renderDocLink(e?.body?.message)
            : e?.body?.message,
          {
            theme$: theme?.theme$,
          }
        ),
      });
    });

  return res;
}

export async function deleteIndices({
  errorMessage,
  http,
  notifications,
  options,
  renderDocLink,
  signal,
  theme,
}: DeleteIndices) {
  const count = options.indices.length;
  const res = await http
    .post(RISK_SCORE_DELETE_INDICES, {
      body: JSON.stringify(options),
      signal,
    })
    .catch((e) => {
      notifications?.toasts?.addDanger({
        title: errorMessage ?? INDICES_DELETION_ERROR_MESSAGE(count),
        text: toMountPoint(
          renderDocLink && e?.body?.message ? renderDocLink(e?.body?.message) : e?.body?.message,
          {
            theme$: theme?.theme$,
          }
        ),
      });
    });

  return res;
}
