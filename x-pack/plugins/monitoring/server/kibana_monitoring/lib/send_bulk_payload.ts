/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ILegacyClusterClient } from 'src/core/server';
import { MONITORING_SYSTEM_API_VERSION, KIBANA_SYSTEM_ID } from '../../../common/constants';

/*
 * Send the Kibana usage data to the ES Monitoring Bulk endpoint
 */
export async function sendBulkPayload(
  cluster: ILegacyClusterClient,
  interval: number,
  payload: object[]
) {
  return cluster.callAsInternalUser('monitoring.bulk', {
    system_id: KIBANA_SYSTEM_ID,
    system_api_version: MONITORING_SYSTEM_API_VERSION,
    interval: interval + 'ms',
    body: payload,
  });
}
