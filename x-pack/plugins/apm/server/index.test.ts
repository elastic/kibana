/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APMXPackConfig } from '.';
import { mergeConfigs } from './index';

describe('mergeConfigs', () => {
  it('merges the configs', () => {
    const apmConfig = {
      transactionIndices: 'traces-apm*,apm-*-transaction-*',
      spanIndices: 'traces-apm*,apm-*-span-*',
      errorIndices: 'logs-apm*,apm-*-error-*',
      metricsIndices: 'metrics-apm*,apm-*-metric-*',
      ui: { enabled: false },
      enabled: true,
      metricsInterval: 2000,
      agent: { migrations: { enabled: true } },
    } as APMXPackConfig;

    expect(mergeConfigs(apmConfig)).toEqual({
      'xpack.apm.errorIndices': 'logs-apm*,apm-*-error-*',
      'xpack.apm.metricsIndices': 'metrics-apm*,apm-*-metric-*',
      'xpack.apm.spanIndices': 'traces-apm*,apm-*-span-*',
      'xpack.apm.transactionIndices': 'traces-apm*,apm-*-transaction-*',
      'xpack.apm.metricsInterval': 2000,
      'xpack.apm.ui.enabled': false,
      'xpack.apm.agent.migrations.enabled': true,
    });
  });
});
