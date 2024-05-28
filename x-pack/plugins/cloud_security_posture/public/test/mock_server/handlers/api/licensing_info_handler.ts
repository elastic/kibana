/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { http, HttpResponse } from 'msw';
import { MOCK_SERVER_LICENSING_INFO_URL } from '../../constants';

export const defaultApiLicensingInfo = http.get(MOCK_SERVER_LICENSING_INFO_URL, () => {
  const date = new Date();
  const expiryDateInMillis = date.setDate(date.getDate() + 30);

  return HttpResponse.json({
    license: {
      uid: '000000-0000-0000-0000-000000000',
      type: 'trial',
      mode: 'trial',
      expiryDateInMillis,
      status: 'active',
    },
    features: {
      aggregate_metric: {
        isAvailable: true,
        isEnabled: true,
      },
      analytics: {
        isAvailable: true,
        isEnabled: true,
      },
      archive: {
        isAvailable: true,
        isEnabled: true,
      },
      ccr: {
        isAvailable: true,
        isEnabled: true,
      },
      data_streams: {
        isAvailable: true,
        isEnabled: true,
      },
      data_tiers: {
        isAvailable: true,
        isEnabled: true,
      },
      enrich: {
        isAvailable: true,
        isEnabled: true,
      },
      enterprise_search: {
        isAvailable: true,
        isEnabled: true,
      },
      eql: {
        isAvailable: true,
        isEnabled: true,
      },
      esql: {
        isAvailable: true,
        isEnabled: true,
      },
      frozen_indices: {
        isAvailable: true,
        isEnabled: true,
      },
      graph: {
        isAvailable: true,
        isEnabled: true,
      },
      ilm: {
        isAvailable: true,
        isEnabled: true,
      },
      logstash: {
        isAvailable: true,
        isEnabled: true,
      },
      ml: {
        isAvailable: true,
        isEnabled: true,
      },
      monitoring: {
        isAvailable: true,
        isEnabled: true,
      },
      rollup: {
        isAvailable: true,
        isEnabled: true,
      },
      searchable_snapshots: {
        isAvailable: true,
        isEnabled: true,
      },
      security: {
        isAvailable: true,
        isEnabled: true,
      },
      slm: {
        isAvailable: true,
        isEnabled: true,
      },
      spatial: {
        isAvailable: true,
        isEnabled: true,
      },
      sql: {
        isAvailable: true,
        isEnabled: true,
      },
      transform: {
        isAvailable: true,
        isEnabled: true,
      },
      universal_profiling: {
        isAvailable: true,
        isEnabled: true,
      },
      voting_only: {
        isAvailable: true,
        isEnabled: true,
      },
      watcher: {
        isAvailable: true,
        isEnabled: true,
      },
    },
    signature: '0000000000000000000000000000000000000000000000000000000',
  });
});
