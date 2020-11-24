/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from 'kibana/public';
import { Alert } from '../../../alerts/common';

const allowedConsumers = ['apm', 'uptime', 'logs', 'metrics', 'alerts'];

export async function getObservabilityAlerts({ core }: { core: CoreStart }) {
  try {
    const { data = [] }: { data: Alert[] } =
      (await core.http.get('/api/alerts/_find', {
        query: {
          page: 1,
          per_page: 20,
        },
      })) || {};

    return data.filter(({ consumer }) => allowedConsumers.includes(consumer));
  } catch (e) {
    console.error('Error while fetching alerts', e);
    throw e;
  }
}
