/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from 'src/core/public';
import {
  INFRA_ALERT_PREVIEW_PATH,
  METRIC_THRESHOLD_ALERT_TYPE_ID,
  METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
  AlertPreviewRequestParams,
  AlertPreviewSuccessResponsePayload,
} from '../../../../common/alerting/metrics';

export type PreviewableAlertTypes =
  | typeof METRIC_THRESHOLD_ALERT_TYPE_ID
  | typeof METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID;

export async function getAlertPreview({
  fetch,
  params,
  alertType,
}: {
  fetch: HttpSetup['fetch'];
  params: AlertPreviewRequestParams;
  alertType: PreviewableAlertTypes;
}): Promise<AlertPreviewSuccessResponsePayload> {
  return await fetch(`${INFRA_ALERT_PREVIEW_PATH}`, {
    method: 'POST',
    body: JSON.stringify({
      ...params,
      alertType,
    }),
  });
}
