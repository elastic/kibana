/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { http, HttpResponse } from 'msw';

export const defaultApiLicensingInfo = http.get('http://localhost/api/licensing/info', () => {
  return HttpResponse.json({
    license: {
      uid: '198c9bb7-8571-4640-ab42-47bc1adc7301',
      type: 'trial',
      mode: 'trial',
      expiryDateInMillis: 1717957208721,
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
    signature: '2e3b6126799df19e45ea0364104d4d0103d2678bb6a1e8ab938a7238f62f4b73',
  });
});
