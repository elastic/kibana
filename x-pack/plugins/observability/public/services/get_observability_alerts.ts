/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AppMountContext } from 'kibana/public';
import { Alert } from '../../../alerts/common';

const allowedConsumers = ['apm', 'uptime', 'logs', 'metrics', 'alerts'];

export async function getObservabilityAlerts({ core }: { core: AppMountContext['core'] }) {
  try {
    const { data = [] }: { data: Alert[] } = await core.http.get(
      core.http.basePath.prepend('/api/alerts/_find'),
      {
        query: {
          page: 1,
          per_page: 20,
        },
      }
    );

    return data.filter(({ consumer }) => allowedConsumers.includes(consumer));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error while fetching alerts', e);
    return [];
  }
}
