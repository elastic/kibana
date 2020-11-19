/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from 'kibana/public';
import * as t from 'io-ts';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { findFirst } from 'fp-ts/lib/Array';
import { isNone } from 'fp-ts/lib/Option';

import { i18n } from '@kbn/i18n';
import { BASE_ALERT_API_PATH, alertStateSchema } from '../common';
import { Alert, AlertType, AlertTaskState } from '../common';

export async function loadAlertTypes({ http }: { http: HttpSetup }): Promise<AlertType[]> {
  return await http.get(`${BASE_ALERT_API_PATH}/list_alert_types`);
}

export async function loadAlertType({
  http,
  id,
}: {
  http: HttpSetup;
  id: AlertType['id'];
}): Promise<AlertType> {
  const maybeAlertType = findFirst<AlertType>((type) => type.id === id)(
    await http.get(`${BASE_ALERT_API_PATH}/list_alert_types`)
  );
  if (isNone(maybeAlertType)) {
    throw new Error(
      i18n.translate('xpack.alerts.loadAlertType.missingAlertTypeError', {
        defaultMessage: 'Alert type "{id}" is not registered.',
        values: {
          id,
        },
      })
    );
  }
  return maybeAlertType.value;
}

export async function loadAlert({
  http,
  alertId,
}: {
  http: HttpSetup;
  alertId: string;
}): Promise<Alert> {
  return await http.get(`${BASE_ALERT_API_PATH}/alert/${alertId}`);
}

type EmptyHttpResponse = '';
export async function loadAlertState({
  http,
  alertId,
}: {
  http: HttpSetup;
  alertId: string;
}): Promise<AlertTaskState> {
  return await http
    .get(`${BASE_ALERT_API_PATH}/alert/${alertId}/state`)
    .then((state: AlertTaskState | EmptyHttpResponse) => (state ? state : {}))
    .then((state: AlertTaskState) => {
      return pipe(
        alertStateSchema.decode(state),
        fold((e: t.Errors) => {
          throw new Error(`Alert "${alertId}" has invalid state`);
        }, t.identity)
      );
    });
}
