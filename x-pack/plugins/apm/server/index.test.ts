/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { APMXPackConfig } from '.';
import { mergeConfigs } from './index';

describe('mergeConfigs', () => {
  it('merges the configs', () => {
    const apmConfig = {
      transactionIndices: 'apm-*-transaction-*',
      spanIndices: 'apm-*-span-*',
      errorIndices: 'apm-*-error-*',
      metricsIndices: 'apm-*-metric-*',
      ui: { enabled: false },
      enabled: true,
      metricsInterval: 2000,
      agent: { migrations: { enabled: true } },
    } as APMXPackConfig;

    expect(mergeConfigs(apmConfig)).toEqual({
      'apm_oss.errorIndices': 'logs-apm*,apm-*-error-*',
      'apm_oss.metricsIndices': 'metrics-apm*,apm-*-metric-*',
      'apm_oss.spanIndices': 'traces-apm*,apm-*-span-*',
      'apm_oss.transactionIndices': 'traces-apm*,apm-*-transaction-*',
      'xpack.apm.metricsInterval': 2000,
      'xpack.apm.ui.enabled': false,
      'xpack.apm.agent.migrations.enabled': true,
    });
  });
});
