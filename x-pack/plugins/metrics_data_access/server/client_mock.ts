/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricsDataClient } from './client/client';

export const MetricsDataClientMock = {
  create: () =>
    ({
      getDefaultMetricIndices: jest.fn(async () => 'default-metrics-indices'),
      getMetricIndices: jest.fn(async () => 'metric-indices'),
      updateMetricIndices: jest.fn(async () => ({
        id: 'id',
        type: 'mock-type',
        attributes: { metricIndices: 'updated-indices' },
        references: [],
      })),
      setDefaultMetricIndicesHandler: jest.fn(),
    } as unknown as MetricsDataClient),
};
