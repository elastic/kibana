/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { HttpSetup } from 'src/core/public';
import {
  INFRA_ALERT_PREVIEW_PATH,
  METRIC_THRESHOLD_ALERT_TYPE_ID,
  METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
  alertPreviewRequestParamsRT,
  alertPreviewSuccessResponsePayloadRT,
} from '../../../common/alerting/metrics';

async function getAlertPreview({
  fetch,
  params,
  alertType,
}: {
  fetch: HttpSetup['fetch'];
  params: rt.TypeOf<typeof alertPreviewRequestParamsRT>;
  alertType:
    | typeof METRIC_THRESHOLD_ALERT_TYPE_ID
    | typeof METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID;
}): Promise<rt.TypeOf<typeof alertPreviewSuccessResponsePayloadRT>> {
  return await fetch(`${INFRA_ALERT_PREVIEW_PATH}`, {
    method: 'POST',
    body: JSON.stringify({
      ...params,
      alertType,
    }),
  });
}

export const getMetricThresholdAlertPreview = ({
  fetch,
  params,
}: {
  fetch: HttpSetup['fetch'];
  params: rt.TypeOf<typeof alertPreviewRequestParamsRT>;
}) => getAlertPreview({ fetch, params, alertType: METRIC_THRESHOLD_ALERT_TYPE_ID });

export const getInventoryAlertPreview = ({
  fetch,
  params,
}: {
  fetch: HttpSetup['fetch'];
  params: rt.TypeOf<typeof alertPreviewRequestParamsRT>;
}) => getAlertPreview({ fetch, params, alertType: METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID });
