/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { APMOSSConfig } from 'src/plugins/apm_oss/server';
import { APMXPackConfig } from '.';
import { mergeConfigs } from './index';

describe('mergeConfigs', () => {
  it('merges the configs', () => {
    const apmOssConfig = {
      transactionIndices: 'apm-*-transaction-*',
      spanIndices: 'apm-*-span-*',
      errorIndices: 'apm-*-error-*',
      metricsIndices: 'apm-*-metric-*',
      indexPattern: 'apm-*',
    } as APMOSSConfig;

    const apmConfig = {
      ui: { enabled: false },
      enabled: true,
      metricsInterval: 2000,
    } as APMXPackConfig;

    expect(mergeConfigs(apmOssConfig, apmConfig)).toEqual({
      'apm_oss.errorIndices': 'apm-*-error-*',
      'apm_oss.indexPattern': 'apm-*',
      'apm_oss.metricsIndices': 'apm-*-metric-*',
      'apm_oss.spanIndices': 'apm-*-span-*',
      'apm_oss.transactionIndices': 'apm-*-transaction-*',
      'xpack.apm.metricsInterval': 2000,
      'xpack.apm.ui.enabled': false,
    });
  });

  it('adds fleet indices', () => {
    const apmOssConfig = {
      transactionIndices: 'apm-*-transaction-*',
      spanIndices: 'apm-*-span-*',
      errorIndices: 'apm-*-error-*',
      metricsIndices: 'apm-*-metric-*',
      fleet: true,
    } as APMOSSConfig;

    const apmConfig = { ui: {} } as APMXPackConfig;

    expect(mergeConfigs(apmOssConfig, apmConfig)).toEqual({
      'apm_oss.errorIndices': 'logs-apm*,apm-*-error-*',
      'apm_oss.metricsIndices': 'metrics-apm*,apm-*-metric-*',
      'apm_oss.spanIndices': 'traces-apm*,apm-*-span-*',
      'apm_oss.transactionIndices': 'traces-apm*,apm-*-transaction-*',
    });
  });

  it('does not add fleet indices', () => {
    const apmOssConfig = {
      transactionIndices: 'apm-*-transaction-*',
      spanIndices: 'apm-*-span-*',
      errorIndices: 'apm-*-error-*',
      metricsIndices: 'apm-*-metric-*',
      fleet: false,
    } as APMOSSConfig;

    const apmConfig = { ui: {} } as APMXPackConfig;

    expect(mergeConfigs(apmOssConfig, apmConfig)).toEqual({
      'apm_oss.errorIndices': 'apm-*-error-*',
      'apm_oss.metricsIndices': 'apm-*-metric-*',
      'apm_oss.spanIndices': 'apm-*-span-*',
      'apm_oss.transactionIndices': 'apm-*-transaction-*',
    });
  });
});
