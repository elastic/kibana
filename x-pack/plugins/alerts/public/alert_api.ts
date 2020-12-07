/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { BASE_ALERT_API_PATH } from '../common';
import type { Alert, AlertType } from '../common';

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
  const maybeAlertType = ((await http.get(
    `${BASE_ALERT_API_PATH}/list_alert_types`
  )) as AlertType[]).find((type) => type.id === id);
  if (!maybeAlertType) {
    throw new Error(
      i18n.translate('xpack.alerts.loadAlertType.missingAlertTypeError', {
        defaultMessage: 'Alert type "{id}" is not registered.',
        values: {
          id,
        },
      })
    );
  }
  return maybeAlertType;
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
