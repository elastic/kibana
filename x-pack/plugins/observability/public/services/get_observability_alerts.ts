/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from 'kibana/public';
import { Alert } from '../../../alerting/common';

const allowedConsumers = ['apm', 'uptime', 'logs', 'infrastructure', 'alerts'];

export async function getObservabilityAlerts({ http }: { http: HttpSetup }) {
  try {
    const { data = [] }: { data: Alert[] } =
      (await http.get('/api/alerts/_find', {
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
